import { InjectionToken, Inject, Injectable, NgModule } from '@angular/core';
import { Lookup } from 'molar';
import { HttpClient, HttpResponse, HttpClientModule } from '@angular/common/http';
import { fromJS } from 'immutable';
import { AsyncSubject } from 'rxjs/AsyncSubject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/interval';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/finally';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/share';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/takeUntil';
import { BrowserModule } from '@angular/platform-browser';

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @record
 */

const APP_CONFIG = new InjectionToken('mechaAppConfig');

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @record
 */

const CACHE = new InjectionToken('mechaCache');

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class MechaCacheService {
    /**
     * @param {?} _appConfig
     */
    constructor(_appConfig) {
        this._appConfig = _appConfig;
        this._cache = new Lookup(false, _appConfig.cacheTtl);
    }
    /**
     * Adds a resource to the cache using a key
     * @param {?} key Key provided to identify the resource in the cache
     * @param {?} value Value for the resource in the cache
     *
     * @param {?=} onDestroy
     * @return {?} Flag indicating if resource was successfully added
     */
    add(key, value, onDestroy) {
        return this._cache.add(key, value, onDestroy);
    }
    /**
     * Removes a resource from the cache by key
     * @param {?} key Key provided to identify the resource in the cache
     *
     * @return {?} Flag indicating if removal was successful
     */
    remove(key) {
        return this._cache.remove(key) > 0;
    }
    /**
     * Finds a resource in the cache by key
     * @param {?} key Key provided to identify the resource in the cache
     *
     * @return {?} The matching resource, if one exists
     */
    find(key) {
        return this._cache.find(key)[0];
    }
    /**
     * Checks if a resource exists in the cache by key
     * @param {?} key Key provided to identify the resource in the cache
     *
     * @return {?} Flag indicating if resource exists in the cache
     */
    contains(key) {
        return this._cache.contains(key);
    }
    /**
     * Remove all resources from the cache
     * @return {?}
     */
    dump() {
        this._cache.clear();
    }
    /**
     * Get time to live in milliseconds for resources in cache
     *
     * @return {?} Time to live in milliseconds
     */
    getCacheTtl() {
        return this._appConfig.cacheTtl;
    }
}
MechaCacheService.decorators = [
    { type: Injectable },
];
/** @nocollapse */
MechaCacheService.ctorParameters = () => [
    { type: undefined, decorators: [{ type: Inject, args: [APP_CONFIG,] },] },
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class MechaHttpResponse {
    /**
     * @param {?} __0
     */
    constructor({ requester, requestNumber = 1, lastRequestTimestamp = new Date(), data, }) {
        this.requester = requester;
        this.requestNumber = requestNumber;
        this.lastRequestTimestamp = lastRequestTimestamp;
        this.data = data;
    }
}
/**
 * @record
 */

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class MechaUtilService {
    /**
     * Converts a string to a hash code
     * @param {?} val Value to be hashed
     *
     * @return {?} Hash code generated from input value
     */
    getHashCode(val) {
        if (!(typeof val === 'string' || val instanceof String)) {
            return null;
        }
        let /** @type {?} */ hash = 0;
        let /** @type {?} */ chr;
        if (val.length === 0) {
            return hash;
        }
        for (let /** @type {?} */ i = 0; i < val.length; i++) {
            chr = val.charCodeAt(i);
            // tslint:disable-next-line:no-bitwise
            hash = ((hash << 5) - hash) + chr;
            // tslint:disable-next-line:no-bitwise
            hash |= 0; // convert to 32-bit integer
        }
        return hash;
    }
}
MechaUtilService.decorators = [
    { type: Injectable },
];
/** @nocollapse */
MechaUtilService.ctorParameters = () => [];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class MechaHttpService {
    /**
     * @param {?} _appConfig
     * @param {?} _cache
     * @param {?} _http
     * @param {?} _util
     */
    constructor(_appConfig, _cache, _http, _util) {
        this._appConfig = _appConfig;
        this._cache = _cache;
        this._http = _http;
        this._util = _util;
        this._requesterHistory = {};
        this.formatError = (errorStatus, errorStatusText, errorMessage) => `${errorStatus}${errorStatusText == null ? '' : ' ' + errorStatusText}${errorMessage == null ? '' : ' - ' + errorMessage}`;
    }
    /**
     * Vanilla get request
     * @template T
     * @param {?} url URL to get resource from
     *
     * @return {?} The response as an observable
     */
    get(url) {
        const /** @type {?} */ requester = 'get';
        return this._http
            .get(url)
            .catch(this.handleResponseError)
            .map((response) => new MechaHttpResponse({
            requester: requester,
            requestNumber: this.getRequestNumber(requester),
            data: this.getResponseJson(response),
        }));
    }
    /**
     * Share a single request amongst subscribers
     * @template T
     * @param {?} url URL to get resource from
     *
     * @return {?} The shared response as an observable
     */
    getShared(url) {
        const /** @type {?} */ requester = 'getShared';
        return this._http
            .get(url)
            .catch(this.handleResponseError)
            .map((response) => new MechaHttpResponse({
            requester: requester,
            requestNumber: this.getRequestNumber(requester),
            data: this.getResponseJson(response),
        }))
            .share();
    }
    /**
     * Thwart spammers with a debounced get
     * @template T
     * @param {?} url URL to get resource from
     * @param {?} requestSource Source subject for making requests
     * @param {?=} debounceInMilliseconds
     * @return {?} The debounced response as an observable
     */
    getDebounced(url, requestSource, debounceInMilliseconds = 1000) {
        const /** @type {?} */ requester = 'getDebounced';
        return requestSource
            .debounceTime(debounceInMilliseconds)
            .switchMap(() => this._http.get(url))
            .catch(this.handleResponseError)
            .map((response) => new MechaHttpResponse({
            requester: requester,
            requestNumber: this.getRequestNumber(requester),
            data: this.getResponseJson(response),
        }))
            .share();
    }
    /**
     * Get responses until a condition is met, just because
     * @template T
     * @param {?} url URL to get resource from
     * @param {?} cancelToken Token used to cancel the interval
     * @param {?=} intervalInMilliseconds
     * @param {?=} numberOfIntervals
     * @return {?} The response in intervals as an observable
     */
    getUntil(url, cancelToken, intervalInMilliseconds = 1000, numberOfIntervals) {
        const /** @type {?} */ requester = 'getUntil';
        let /** @type {?} */ getUntil$ = Observable
            .interval(intervalInMilliseconds)
            .takeUntil(cancelToken);
        if (numberOfIntervals != null) {
            getUntil$ = getUntil$.take(numberOfIntervals);
        }
        return getUntil$
            .switchMap(() => this._http.get(url))
            .catch(this.handleResponseError)
            .map((response) => new MechaHttpResponse({
            requester: requester,
            requestNumber: this.getRequestNumber(requester),
            data: this.getResponseJson(response),
        }))
            .share();
    }
    /**
     * Make sure nothing is messing with your response
     * @template T
     * @param {?} url URL to get resource from
     *
     * @return {?} The response shared immutably as an observable
     */
    getImmutable(url) {
        const /** @type {?} */ requester = 'getImmutable';
        return this._http
            .get(url)
            .catch(this.handleResponseError)
            .map((response) => fromJS(new MechaHttpResponse({
            requester: requester,
            requestNumber: this.getRequestNumber(requester),
            data: this.getResponseJson(response),
        })))
            .share()
            .map((immutable) => immutable.toJS());
    }
    /**
     * Cache a response to save trips to the backend
     * @template T
     * @param {?} url URL to get resource from
     *
     * @return {?} The cached response as an observable
     */
    getCached(url) {
        try {
            const /** @type {?} */ requester = 'getCached';
            const /** @type {?} */ key = this._util.getHashCode(url); // hashing URL and using as key in cache
            let /** @type {?} */ cachedSource = this._cache.find(key);
            // if initial call or cache is expired, make fetch
            if (cachedSource == null) {
                cachedSource = new AsyncSubject();
                this._cache.add(key, cachedSource, () => cachedSource.complete());
                this._http
                    .get(url)
                    .catch(this.handleResponseError)
                    .map((response) => new MechaHttpResponse({
                    requester: requester,
                    requestNumber: this.getRequestNumber(requester),
                    data: this.getResponseJson(response),
                }))
                    .subscribe(cachedSource);
            }
            return cachedSource.asObservable();
        }
        catch (/** @type {?} */ err) {
            return Observable.throw(err);
        }
    }
    /**
     * Cache a response to save trips to the backend and pass immutable copy to subscribers so they don't mess with each other
     * @template T
     * @param {?} url URL to get resource from
     *
     * @return {?} The cached response shared immutably as an observable
     */
    getCachedImmutable(url) {
        try {
            const /** @type {?} */ requester = 'getCachedImmutable';
            const /** @type {?} */ key = this._util.getHashCode(`immutable${url}`); // hashing URL and using as key in cache
            let /** @type {?} */ cachedImmutableSource = this._cache.find(key);
            // if initial call or cache is expired, make fetch
            if (cachedImmutableSource == null) {
                cachedImmutableSource = new AsyncSubject();
                this._cache.add(key, cachedImmutableSource, () => cachedImmutableSource.complete());
                this._http
                    .get(url)
                    .catch(this.handleResponseError)
                    .map((response) => fromJS(new MechaHttpResponse({
                    requester: requester,
                    requestNumber: this.getRequestNumber(requester),
                    data: this.getResponseJson(response),
                })))
                    .subscribe(cachedImmutableSource);
            }
            return cachedImmutableSource.map((immutable) => immutable.toJS());
        }
        catch (/** @type {?} */ err) {
            return Observable.throw(err);
        }
    }
    /**
     * @param {?} requester
     * @return {?}
     */
    getRequestNumber(requester) {
        return ++(this._requesterHistory[requester] = this._requesterHistory[requester] || { requestNumber: 0 }).requestNumber;
    }
    /**
     * @template T
     * @param {?} response
     * @return {?}
     */
    getResponseJson(response) {
        try {
            return response.body;
        }
        catch (/** @type {?} */ err) {
            return err;
        }
    }
    /**
     * @param {?} error
     * @return {?}
     */
    handleResponseError(error) {
        let /** @type {?} */ errorMessage;
        if (error instanceof HttpResponse) {
            const /** @type {?} */ json = error.body;
            const /** @type {?} */ err = json.error || JSON.stringify(json);
            errorMessage = this.formatError(error.status, error.statusText, err);
        }
        else {
            errorMessage = error.message ? error.message : error.toString();
        }
        return Observable.throw(errorMessage);
    }
}
MechaHttpService.decorators = [
    { type: Injectable },
];
/** @nocollapse */
MechaHttpService.ctorParameters = () => [
    { type: undefined, decorators: [{ type: Inject, args: [APP_CONFIG,] },] },
    { type: undefined, decorators: [{ type: Inject, args: [CACHE,] },] },
    { type: HttpClient, },
    { type: MechaUtilService, },
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
const defaultConfig = {
    cacheTtl: 60000,
};
/**
 * @record
 */

class MechaModule {
    /**
     * @param {?} __0
     * @return {?}
     */
    static forRoot({ appConfig, cacheClass, }) {
        return {
            ngModule: MechaModule,
            providers: [
                { provide: APP_CONFIG, useValue: appConfig || defaultConfig },
                { provide: CACHE, useClass: cacheClass || MechaCacheService },
            ]
        };
    }
}
MechaModule.decorators = [
    { type: NgModule, args: [{
                imports: [
                    BrowserModule,
                    HttpClientModule,
                ],
                providers: [
                    MechaCacheService,
                    MechaHttpService,
                    MechaUtilService,
                ],
            },] },
];
/** @nocollapse */
MechaModule.ctorParameters = () => [];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * Generated bundle index. Do not edit.
 */

export { MechaModule, APP_CONFIG as ɵc, CACHE as ɵf, MechaHttpService as ɵd, MechaCacheService as ɵa, MechaUtilService as ɵg };
//# sourceMappingURL=mecha-ngx.js.map
