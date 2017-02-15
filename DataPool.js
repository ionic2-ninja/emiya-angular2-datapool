"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
/**
 * Created by Lee on 2016/9/7.
 */
var emiya_angular2_token_1 = require("emiya-angular2-token");
var emiya_js_utils_1 = require("emiya-js-utils");
var core_1 = require("@angular/core");
var emiya_angular2_Event_1 = require("emiya-angular2-Event");
var emiya_angular2_fetch_1 = require("emiya-angular2-fetch");
var constants = {
    tokenStorageMethod: 'local',
    httpRequestTimeout: 15000
};
var DataPool = (function () {
    function DataPool(https) {
        var _this = this;
        this.https = https;
        this.infos = [];
        this.configs = [];
        this.request_queue = [];
        this.enable = false;
        this.event = emiya_angular2_Event_1.Event;
        this.utils = emiya_js_utils_1.Utils;
        this.token = emiya_angular2_token_1.Token;
        this.updateLocalData = function () {
            window.localStorage['dataPool'] = JSON.stringify({ configs: _this.configs, infos: _this.infos });
            //console.log('write',JSON.parse(window.localStorage['dataPool']))
        };
        if (this.utils.notNullStrAndObj(window.localStorage['dataPool'])) {
            var parsed = JSON.parse(window.localStorage['dataPool']);
            if (this.utils.notNull(parsed['configs']) && (parsed['configs'] instanceof Array)) {
                this.configs = parsed['configs'];
                if (this.utils.notNull(parsed['infos']) && (parsed['infos'] instanceof Array)) {
                    this.infos = parsed['infos'];
                }
            }
        }
        this.onChange(this.updateLocalData, null, false);
    }
    DataPool.prototype.load = function (config, overload) {
        if (overload === void 0) { overload = false; }
        if (config instanceof Array) {
            //this.configs = [...this.configs, ...config]
            for (var c in config) {
                this.unload(config[c].id, overload, true);
                if (this.utils.notNull(config[c].period))
                    config[c].period = 3600;
                this.configs.push(config[c]);
            }
        }
        else {
            this.unload(config.id, overload, true);
            if (this.utils.notNull(config.period))
                config.period = 3600;
            this.configs.push(config);
        }
        if (this.configs && this.configs.length > 0) {
            if (!this.mon) {
                this.mon = this.event.subscribe('tokenChanged', this.handler.bind(this));
            }
            this.enable = true;
        }
        if (!this.configs || this.configs.length == 0) {
            this.infos = [];
            this.infos = [];
            this.request_queue = [];
            this.enable = false;
            if (this.mon) {
                this.mon.unsubscribe();
                this.mon = null;
            }
        }
        this.updateLocalData();
    };
    DataPool.prototype.unload = function (id, overload, skipConfigCheck) {
        if (id === void 0) { id = null; }
        if (overload === void 0) { overload = false; }
        if (skipConfigCheck === void 0) { skipConfigCheck = false; }
        if (id == null) {
            this.configs = [];
        }
        else if (!(id instanceof Array)) {
            var tmp = [];
            for (var c in this.configs) {
                if (this.configs[c].id != id)
                    tmp.push(this.configs[c]);
            }
            this.configs = tmp;
            if (overload != false) {
                tmp = [];
                for (var c in this.infos) {
                    if (this.infos[c].id != id)
                        tmp.push(this.infos[c]);
                }
                this.infos = tmp;
                tmp = [];
                for (var c in this.request_queue) {
                    if (this.request_queue[c] != id)
                        tmp.push(this.request_queue[c]);
                }
                this.request_queue = tmp;
            }
        }
        else {
            for (var c in id)
                this.unload(id[c], overload);
        }
        if (skipConfigCheck == false) {
            if (this.configs.length == 0) {
                this.infos = [];
                this.infos = [];
                this.request_queue = [];
                this.enable = false;
                if (this.mon) {
                    this.mon.unsubscribe();
                    this.mon = null;
                }
            }
            this.updateLocalData();
        }
    };
    DataPool.prototype.handler = function (ev, data) {
        var infos = this.infos, configs = this.configs, utils = this.utils, token = this.token, event = this.event, request_queue = this.request_queue, enable = this.enable;
        if (data.action == 'clear') {
            infos = [];
            event.emit('dataChanged', { action: 'clear' });
            return;
        }
        //console.log(this.token)
        var config, method, _data, paths, index;
        for (var c in configs) {
            config = configs[c];
            if (!utils.notBlankStrAndObj(config.bind_tokens_method)) {
                method = [];
                for (var y in config.bind_tokens)
                    method.push(constants.tokenStorageMethod);
            }
            else
                method = config.bind_tokens_method;
            if (data.action == 'renew' || data.action == 'add') {
                var m = utils.simple_array_filter(infos, 'id', config.id);
                if (utils.notBlankStrAndObj(config.bind_tokens) && config.bind_tokens.indexOf(data["new"].key) < 0 || token['hasAll'](config.bind_tokens, method) == false || request_queue.indexOf(config.id) >= 0 || (m && m.length > 0 && new Date().getTime() - m[0].timestamp <= (config.period * 1000)))
                    continue;
                request_queue.push(config.id);
                var requestPromise = void 0;
                if (config.request) {
                    requestPromise = this.https.request(config.request);
                }
                else if (utils.notNull(config.localData)) {
                    requestPromise = function () {
                        if (config.localData instanceof Promise)
                            return config.localData;
                        else
                            return new Promise(function (_resolve, _reject) {
                                try {
                                    if (typeof config.localData == 'function') {
                                        var e = config.localData();
                                        if (e instanceof Promise) {
                                            e.then(function (w) { return _resolve({ data: w }); }, function (w) { return _reject(w); });
                                        }
                                        else
                                            _resolve({ data: config.localData() });
                                    }
                                    else
                                        _resolve({ data: config.localData });
                                }
                                catch (e) {
                                    _reject(e);
                                }
                            });
                    };
                    requestPromise = requestPromise();
                }
                else {
                    request_queue.splice(request_queue.indexOf(config.id), 1);
                    return;
                }
                requestPromise.then(function (w) {
                    if (!timer)
                        clearTimeout(timer);
                    if (!utils.notBlankStrAndObj(w) /*|| !utils.notBlankStrAndObj(w['data'])*/) {
                        request_queue.splice(request_queue.indexOf(config.id), 1);
                        return;
                    }
                    var data = w['data'];
                    var paths, method, index, _data;
                    if (utils.notBlankStr(config.condition_path)) {
                        if (config.condition_mode === 'header')
                            _data = w['header']();
                        else
                            _data = data;
                        if (!utils.notNull(_data)) {
                            request_queue.splice(request_queue.indexOf(config.id), 1);
                            return;
                        }
                        paths = config.condition_path.split('.');
                        for (var d in paths) {
                            if (paths[d].substr(0, 1) === '[' && paths[d].substr(paths[d].length - 1) === ']')
                                index = paths[d].substr(1, paths[d].length - 2);
                            else
                                index = paths[d];
                            if (typeof _data == 'object' && utils.notNull(_data[index]))
                                _data = _data[index];
                            else {
                                _data = null;
                                break;
                            }
                        }
                        if (!utils.notNull(_data) || (utils.notNull(config.condition_value) && _data != config.condition_value)) {
                            request_queue.splice(request_queue.indexOf(config.id), 1);
                            return;
                        }
                    }
                    _data = null;
                    paths = null;
                    if (config.receive_mode === 'header')
                        _data = w['header']();
                    else
                        _data = data;
                    if (!_data)
                        return;
                    if (utils.notBlankStr(config.receive_path))
                        paths = config.receive_path.split('.');
                    // else
                    //   paths = ['data']
                    for (var d in paths) {
                        if (paths[d].substr(0, 1) === '[' && paths[d].substr(paths[d].length - 1) === ']')
                            index = paths[d].substr(1, paths[d].length - 2);
                        else
                            index = paths[d];
                        if (typeof _data == 'object' && utils.notNull(_data[index]))
                            _data = _data[index];
                        else {
                            _data = null;
                            break;
                        }
                    }
                    if (_data) {
                        if (m && m.length > 0) {
                            infos.splice(infos.indexOf(m[0]), 1);
                            //console.log(2,infos)
                        }
                        var info = {};
                        if (utils.notBlankStrAndObj(config.transform)) {
                            if (typeof config.transform != 'function') {
                                for (var r in config.transform) {
                                    var road = config.transform[r].split('.');
                                    var msg = _data;
                                    for (var d in road) {
                                        if (road[d].substr(0, 1) === '[' && road[d].substr(road[d].length - 1) === ']')
                                            index = road[d].substr(1, road[d].length - 2);
                                        else
                                            index = road[d];
                                        if (typeof msg == 'object' && utils.notNull(msg[index]))
                                            msg = msg[index];
                                        else {
                                            msg = null;
                                            break;
                                        }
                                    }
                                    if (utils.notNull(msg)) {
                                        info[r] = msg;
                                    }
                                    //console.log(info)
                                }
                            }
                            else {
                                info = config.transform(_data);
                            }
                        }
                        if (m && m.length > 0) {
                            utils.mergeObject(info, m[0].info);
                            //utils.mergeObject(_data, m[0].raw);
                        }
                        if (enable == true) {
                            var _info = {
                                id: config.id,
                                raw: _data,
                                //info: utils.mergeObject(info, _data),
                                timestamp: new Date().getTime(),
                                period: config.period
                            };
                            infos.push(_info);
                            //console.log(3,infos)
                            event.emit('dataChanged', {
                                action: 'renew',
                                id: config.id,
                                data: utils.deepCopy(_info), isRefresh: true
                            });
                        }
                    }
                    request_queue.splice(request_queue.indexOf(config.id), 1);
                    //console.log(infos)
                }, function (w) {
                    if (!timer)
                        clearTimeout(timer);
                    request_queue.splice(request_queue.indexOf(config.id), 1);
                });
                var sec;
                if (utils.notNullStrAndObj(config.timeout))
                    sec = config.timeout;
                else
                    sec = constants.httpRequestTimeout;
                if (sec >= 0)
                    var timer = setTimeout(function () {
                        if (request_queue.indexOf(config.id) >= 0)
                            request_queue.splice(request_queue.indexOf(config.id), 1);
                    }, sec);
                break;
            }
            else if (data.action = 'delete') {
                var m = utils.simple_array_filter(infos, 'id', config.id);
                if (utils.notBlankStrAndObj(config.bind_tokens) && config.bind_tokens.indexOf(data.target.key) >= 0 && (m && m.length > 0)) {
                    infos.splice(infos.indexOf(m[0]), 1);
                    event.emit('dataChanged', { action: 'delete', id: config.id });
                    break;
                }
                //console.log(infos)
            }
        }
    };
    DataPool.prototype._handler = function (key, key2, resolve, reject, isRaw, isPath) {
        var _this = this;
        if (isPath === void 0) { isPath = false; }
        var infos = this.infos, configs = this.configs, utils = this.utils, token = this.token, event = this.event, request_queue = this.request_queue, enable = this.enable;
        var config, method, _data, paths, index, flag = true;
        isRaw = utils.notNull(isRaw) ? isRaw : 'info';
        //alert(isRaw)
        for (var c in configs) {
            config = configs[c];
            if (config.id != key)
                continue;
            flag = false;
            // if (!utils.notnull3(config.bind_tokens_method)) {
            //   method = [];
            //   for (var y in config.bind_tokens)
            //     method.push(constants.tokenStorageMethod);
            // }
            // else
            //   method = config.bind_tokens_method;
            //
            // if (token.hasTokens(config.bind_tokens, method) == false) {
            //   deferred.reject(-1);
            //   return;
            // }
            request_queue.push(config.id);
            var requestPromise = void 0;
            if (config.request) {
                requestPromise = this.https.request(config.request);
            }
            else if (utils.notNull(config.localData)) {
                requestPromise = function () {
                    if (config.localData instanceof Promise)
                        return config.localData;
                    else
                        return new Promise(function (_resolve, _reject) {
                            try {
                                if (typeof config.localData == 'function') {
                                    var e = config.localData();
                                    if (e instanceof Promise) {
                                        e.then(function (w) { return _resolve({ data: w }); }, function (w) { return _reject(w); });
                                    }
                                    else
                                        _resolve({ data: config.localData() });
                                }
                                else
                                    _resolve({ data: config.localData });
                            }
                            catch (e) {
                                _reject(e);
                            }
                        });
                };
                requestPromise = requestPromise();
            }
            else {
                request_queue.splice(request_queue.indexOf(config.id), 1);
                reject(-29);
                return;
            }
            requestPromise.then(function (w) {
                if (!timer)
                    clearTimeout(timer);
                if (!utils.notBlankStrAndObj(w) /*|| !utils.notBlankStrAndObj(w['data'])*/) {
                    request_queue.splice(request_queue.indexOf(config.id), 1);
                    reject(-4);
                    return;
                }
                var data = w['data'];
                if (utils.notBlankStr(config.condition_path)) {
                    _data = null;
                    if (config.condition_mode === 'header')
                        _data = w['header']();
                    else
                        _data = data;
                    if (!_data) {
                        request_queue.splice(request_queue.indexOf(config.id), 1);
                        reject(-30);
                        return;
                    }
                    paths = config.condition_path.split('.');
                    for (var d in paths) {
                        if (paths[d].substr(0, 1) === '[' && paths[d].substr(paths[d].length - 1) === ']')
                            index = paths[d].substr(1, paths[d].length - 2);
                        else
                            index = paths[d];
                        if (typeof _data == 'object' && utils.notNull(_data[index]))
                            _data = _data[index];
                        else {
                            _data = null;
                            break;
                        }
                    }
                    if (utils.notNull(config.condition_value) && _data != config.condition_value) {
                        reject(-15);
                        request_queue.splice(request_queue.indexOf(config.id), 1);
                        return;
                    }
                    else if (!utils.notNull(config.condition_value) && !utils.notNull(_data)) {
                        reject(-20);
                        request_queue.splice(request_queue.indexOf(config.id), 1);
                        return;
                    }
                }
                _data = null;
                paths = null;
                if (config.receive_mode === 'header')
                    _data = w['header']();
                else
                    _data = data;
                if (!_data) {
                    request_queue.splice(request_queue.indexOf(config.id), 1);
                    reject(-31);
                    return;
                }
                if (utils.notBlankStr(config.receive_path))
                    paths = config.receive_path.split('.');
                // else
                //   paths = ['data']
                for (var d in paths) {
                    if (paths[d].substr(0, 1) === '[' && paths[d].substr(paths[d].length - 1) === ']')
                        index = paths[d].substr(1, paths[d].length - 2);
                    else
                        index = paths[d];
                    if (typeof _data == 'object' && utils.notNull(_data[index]))
                        _data = _data[index];
                    else {
                        _data = null;
                        break;
                    }
                }
                if (utils.notNull(_data)) {
                    var m = utils.simple_array_filter(infos, 'id', config.id);
                    if (m && m.length > 0)
                        infos.splice(infos.indexOf(m[0]), 1);
                    var info = {};
                    if (utils.notBlankStrAndObj(config.transform)) {
                        if (typeof config.transform != 'function') {
                            for (var r in config.transform) {
                                var road = config.transform[r].split('.');
                                var msg = _data;
                                for (var d in road) {
                                    if (road[d].substr(0, 1) === '[' && road[d].substr(road[d].length - 1) === ']')
                                        index = road[d].substr(1, road[d].length - 2);
                                    else
                                        index = road[d];
                                    if (typeof msg == 'object' && utils.notNull(msg[index]))
                                        msg = msg[index];
                                    else {
                                        msg = null;
                                        break;
                                    }
                                }
                                if (utils.notNull(msg)) {
                                    info[r] = msg;
                                }
                            }
                        }
                        else {
                            info = config.transform(_data);
                        }
                    }
                    if (m && m.length > 0) {
                        utils.mergeObject(info, m[0].info);
                        //utils.mergeObject(_data, m[0].raw);
                    }
                    if (enable == true) {
                        var _info = {
                            id: config.id,
                            raw: _data,
                            //info: utils.mergeObject(info, _data),
                            timestamp: new Date().getTime(),
                            period: config.period
                        };
                        infos.push(_info);
                        if (utils.notNull(key2)) {
                            if (isPath != false) {
                                var result = _this.parseByPath(_info[isRaw], key2);
                                if (result !== undefined)
                                    resolve(utils.deepCopy(result));
                                else
                                    reject(-10);
                            }
                            else {
                                if (utils.notNull(_info[isRaw]) && utils.notNull((_info[isRaw])[key2]))
                                    resolve(utils.deepCopy((_info[isRaw])[key2]));
                                else
                                    reject(-10);
                            }
                        }
                        else {
                            if (utils.notNull(_info[isRaw]))
                                resolve(utils.deepCopy((_info[isRaw])));
                            else
                                reject(-9);
                        }
                        event.emit('dataChanged', {
                            action: 'renew',
                            id: config.id,
                            data: utils.deepCopy(_info),
                            isRefresh: true
                        });
                    }
                    else {
                        reject(-2);
                    }
                }
                else
                    reject(-3);
                request_queue.splice(request_queue.indexOf(config.id), 1);
                //console.log(infos)
            }, function (w) {
                if (!timer)
                    clearTimeout(timer);
                request_queue.splice(request_queue.indexOf(config.id), 1);
                reject(-5);
            });
            var sec;
            if (utils.notNullStrAndObj(config.timeout))
                sec = config.timeout;
            else
                sec = constants.httpRequestTimeout;
            if (sec >= 0)
                var timer = setTimeout(function () {
                    if (request_queue.indexOf(config.id) >= 0)
                        request_queue.splice(request_queue.indexOf(config.id), 1);
                    reject(-6);
                }, sec);
            break;
        }
        if (flag == true)
            reject(-7);
    };
    DataPool.prototype._handler2 = function (key, key2, value, resolve, reject, isRemove, isRaw, isPath) {
        var _this = this;
        if (isPath === void 0) { isPath = false; }
        var infos = this.infos, configs = this.configs, utils = this.utils, token = this.token, event = this.event, request_queue = this.request_queue, enable = this.enable;
        var config, method, _data, paths, index, flag = true;
        isRaw = utils.notNull(isRaw) ? isRaw : 'info';
        isRemove = utils.notNull(isRemove) ? isRemove : false;
        for (var c in configs) {
            config = configs[c];
            if (config.id != key)
                continue;
            flag = false;
            // if (!utils.notnull3(config.bind_tokens_method)) {
            //   method = [];
            //   for (var y in config.bind_tokens)
            //     method.push(constants.tokenStorageMethod);
            // }
            // else
            //   method = config.bind_tokens_method;
            //
            // if (token.hasTokens(config.bind_tokens, method) == false) {
            //   deferred.reject(-1);
            //   return;
            // }
            request_queue.push(config.id);
            var requestPromise = void 0;
            if (config.request) {
                requestPromise = this.https.request(config.request);
            }
            else if (utils.notNull(config.localData)) {
                requestPromise = function () {
                    if (config.localData instanceof Promise)
                        return config.localData;
                    else
                        return new Promise(function (_resolve, _reject) {
                            try {
                                if (typeof config.localData == 'function') {
                                    var e = config.localData();
                                    if (e instanceof Promise) {
                                        e.then(function (w) { return _resolve({ data: w }); }, function (w) { return _reject(w); });
                                    }
                                    else
                                        _resolve({ data: config.localData() });
                                }
                                else
                                    _resolve({ data: config.localData });
                            }
                            catch (e) {
                                _reject(e);
                            }
                        });
                };
                requestPromise = requestPromise();
            }
            else {
                request_queue.splice(request_queue.indexOf(config.id), 1);
                reject(-29);
                return;
            }
            requestPromise.then(function (w) {
                if (!timer)
                    clearTimeout(timer);
                if (!utils.notBlankStrAndObj(w) /*|| !utils.notBlankStrAndObj(w['data'])*/) {
                    request_queue.splice(request_queue.indexOf(config.id), 1);
                    reject(-4);
                    return;
                }
                var data = w['data'];
                if (utils.notBlankStr(config.condition_path)) {
                    _data = null;
                    if (config.condition_mode === 'header')
                        _data = w['header']();
                    else
                        _data = data;
                    if (!_data) {
                        request_queue.splice(request_queue.indexOf(config.id), 1);
                        reject(-30);
                        return;
                    }
                    paths = config.condition_path.split('.');
                    for (var d in paths) {
                        if (paths[d].substr(0, 1) === '[' && paths[d].substr(paths[d].length - 1) === ']')
                            index = paths[d].substr(1, paths[d].length - 2);
                        else
                            index = paths[d];
                        if (typeof _data == 'object' && utils.notNull(_data[index]))
                            _data = _data[index];
                        else {
                            _data = null;
                            break;
                        }
                    }
                    if (utils.notNull(config.condition_value) && _data != config.condition_value) {
                        reject(-15);
                        request_queue.splice(request_queue.indexOf(config.id), 1);
                        return;
                    }
                    else if (!utils.notNull(config.condition_value) && !utils.notNull(_data)) {
                        reject(-20);
                        request_queue.splice(request_queue.indexOf(config.id), 1);
                        return;
                    }
                }
                _data = null;
                paths = null;
                if (config.receive_mode === 'header')
                    _data = w['header']();
                else
                    _data = data;
                if (!_data) {
                    request_queue.splice(request_queue.indexOf(config.id), 1);
                    reject(-31);
                    return;
                }
                if (utils.notBlankStr(config.receive_path))
                    paths = config.receive_path.split('.');
                // else
                //   paths = ['data']
                for (var d in paths) {
                    if (paths[d].substr(0, 1) === '[' && paths[d].substr(paths[d].length - 1) === ']')
                        index = paths[d].substr(1, paths[d].length - 2);
                    else
                        index = paths[d];
                    if (typeof _data == 'object' && utils.notNull(_data[index]))
                        _data = _data[index];
                    else {
                        _data = null;
                        break;
                    }
                }
                if (utils.notNull(_data)) {
                    var m = utils.simple_array_filter(infos, 'id', config.id);
                    if (m && m.length > 0)
                        infos.splice(infos.indexOf(m[0]), 1);
                    var info = {};
                    if (utils.notBlankStrAndObj(config.transform)) {
                        if (typeof config.transform != 'function') {
                            for (var r in config.transform) {
                                var road = config.transform[r].split('.');
                                var msg = _data;
                                for (var d in road) {
                                    if (road[d].substr(0, 1) === '[' && road[d].substr(road[d].length - 1) === ']')
                                        index = road[d].substr(1, road[d].length - 2);
                                    else
                                        index = road[d];
                                    if (typeof msg == 'object' && utils.notNull(msg[index]))
                                        msg = msg[index];
                                    else {
                                        msg = null;
                                        break;
                                    }
                                }
                                if (utils.notNull(msg)) {
                                    info[r] = msg;
                                }
                            }
                        }
                        else {
                            info = config.transform(_data);
                        }
                    }
                    if (m && m.length > 0) {
                        utils.mergeObject(info, m[0].info);
                        //utils.mergeObject(_data, m[0].raw);
                    }
                    if (enable == true) {
                        var _info = {
                            id: config.id,
                            raw: _data,
                            //info: utils.mergeObject(info, _data),
                            timestamp: new Date().getTime(),
                            period: config.period
                        };
                        infos.push(_info);
                        if (isRaw == 'info') {
                            if (utils.notNull(_info['info'])) {
                                if (isRemove == false) {
                                    _info['info'][key2] = value;
                                    resolve(utils.deepCopy(_info['info'][key2]));
                                }
                                else {
                                    delete _info['info'][key2];
                                    resolve(0);
                                }
                            }
                            else
                                reject(-10);
                        }
                        else {
                            if (utils.notNull(key2))
                                //if (utils.notNull(_info.raw)) {
                                if (isRemove == false) {
                                    if (isPath != false) {
                                        _info.raw = _this.constructObj(_info.raw, key2, utils.deepCopy(value));
                                        resolve(utils.deepCopy(value));
                                    }
                                    else {
                                        if (utils.notNull(_info.raw)) {
                                            _info.raw[key2] = utils.deepCopy(value);
                                            resolve(utils.deepCopy(value));
                                        }
                                        else
                                            reject(-10);
                                    }
                                    // _info.raw[key2] = utils.deepCopy(value);
                                }
                                else {
                                    if (isPath != false) {
                                        var result = _this.deleteObj(_info.raw, key2);
                                        if (result !== false) {
                                            _info.raw = result;
                                            resolve(0);
                                        }
                                        else
                                            reject(-10);
                                    }
                                    else {
                                        if (utils.notNull(_info.raw) && typeof _info.raw == 'object' && _info.raw != null) {
                                            delete _info.raw[key2];
                                            resolve(0);
                                        }
                                        else
                                            reject(-10);
                                    }
                                }
                            else {
                                if (isRemove == false) {
                                    _info.raw = utils.deepCopy(value);
                                    resolve(utils.deepCopy(_info.raw));
                                }
                                else {
                                    _info.raw = null;
                                    resolve(0);
                                }
                            }
                        }
                        event.emit('dataChanged', {
                            action: 'renew',
                            id: config.id,
                            data: utils.deepCopy(_info),
                            isRefresh: true
                        });
                    }
                    else {
                        reject(-2);
                    }
                }
                else
                    reject(-3);
                request_queue.splice(request_queue.indexOf(config.id), 1);
                //console.log(infos)
            }, function (w) {
                if (!timer)
                    clearTimeout(timer);
                request_queue.splice(request_queue.indexOf(config.id), 1);
                reject(-5);
            });
            var sec;
            if (utils.notNullStrAndObj(config.timeout))
                sec = config.timeout;
            else
                sec = constants.httpRequestTimeout;
            if (sec >= 0)
                var timer = setTimeout(function () {
                    if (request_queue.indexOf(config.id) >= 0)
                        request_queue.splice(request_queue.indexOf(config.id), 1);
                    reject(-6);
                }, sec);
            break;
        }
        if (flag == true)
            reject(-7);
    };
    DataPool.prototype.request = function (_id) {
        var _this = this;
        var id = _id;
        var _m = this.utils.simple_array_filter(this.configs, 'id', id);
        if (_m.length <= 0)
            return;
        var utils = this.utils, configs = this.configs, token = this.token;
        var checkValid = function () {
            var m = utils.simple_array_filter(configs, 'id', id);
            if (m.length <= 0)
                return false;
            m = m[0];
            var method = [];
            if (!utils.notBlankStrAndObj(m['bind_tokens_method'])) {
                for (var y in m['bind_tokens'])
                    method.push(constants.tokenStorageMethod);
            }
            else
                method = m['bind_tokens_method'];
            if (utils.notNullStrAndObj(m['bind_tokens']))
                return token['hasAll'](m['bind_tokens'], method);
            else
                return true;
        };
        var read = function (key, refresh) {
            return new Promise(function (resolve, reject) {
                if (checkValid() == false) {
                    reject(-12);
                    return;
                }
                refresh = utils.notBlankStr(refresh) ? refresh : false;
                var m = utils.simple_array_filter(_this.infos, 'id', id);
                if ((!m || m.length <= 0 || (m[0].period >= 0 && new Date().getTime() - m[0].timestamp > m[0].period * 1000)) || refresh == true) {
                    _this._handler(id, key, resolve, reject, 'info');
                    //alert(123)
                }
                else {
                    if (utils.notNull(key)) {
                        if (utils.notNull(m[0].info) && utils.notNull(m[0].info[key]))
                            resolve(utils.deepCopy(m[0].info[key]));
                        else
                            reject(-10);
                    }
                    else {
                        if (utils.notNull(m[0].info))
                            resolve(utils.deepCopy(m[0].info));
                        else
                            reject(-9);
                    }
                }
            });
        };
        var readRaw = function (key, refresh) {
            return new Promise(function (resolve, reject) {
                if (checkValid() == false) {
                    reject(-12);
                    return;
                }
                refresh = utils.notBlankStr(refresh) ? refresh : false;
                //console.log(configs)
                var m = utils.simple_array_filter(_this.infos, 'id', id);
                if ((!m || m.length <= 0 || (m[0].period >= 0 && new Date().getTime() - m[0].timestamp > m[0].period * 1000)) || refresh == true) {
                    _this._handler(id, key, resolve, reject, 'raw');
                    //alert(123)
                }
                else {
                    if (utils.notNull(key)) {
                        if (utils.notNull(m[0].raw) && utils.notNull(m[0].raw[key]))
                            resolve(utils.deepCopy(m[0].raw[key]));
                        else
                            reject(-10);
                    }
                    else {
                        if (utils.notNull(m[0].raw))
                            resolve(utils.deepCopy(m[0].raw));
                        else
                            reject(-9);
                    }
                }
            });
        };
        var readByPath = function (key, refresh) {
            return new Promise(function (resolve, reject) {
                if (checkValid() == false) {
                    reject(-12);
                    return;
                }
                refresh = utils.notBlankStr(refresh) ? refresh : false;
                //console.log(configs)
                var m = utils.simple_array_filter(_this.infos, 'id', id);
                if ((!m || m.length <= 0 || (m[0].period >= 0 && new Date().getTime() - m[0].timestamp > m[0].period * 1000)) || refresh == true) {
                    _this._handler(id, key, resolve, reject, 'raw', true);
                    //alert(123)
                }
                else {
                    if (utils.notNull(key)) {
                        var result = _this.parseByPath(m[0].raw, key);
                        if (result !== undefined)
                            resolve(utils.deepCopy(result));
                        else
                            reject(-10);
                    }
                    else {
                        if (utils.notNull(m[0].raw))
                            resolve(utils.deepCopy(m[0].raw));
                        else
                            reject(-9);
                    }
                }
            });
        };
        var write = function (key, value) {
            return new Promise(function (resolve, reject) {
                if (checkValid() == false) {
                    reject(-12);
                    return;
                }
                if (utils.notNull(key)) {
                    var m = utils.simple_array_filter(_this.infos, 'id', id);
                    if (!m || m.length <= 0 || (m[0].period >= 0 && new Date().getTime() - m[0].timestamp > m[0].period * 1000)) {
                        _this._handler2(id, key, value, resolve, reject, false, 'info');
                        //alert(123)
                    }
                    else {
                        if (utils.notNull(m[0].info)) {
                            m[0].info[key] = value;
                            _this.event.emit('dataChanged', {
                                action: 'renew',
                                id: id,
                                data: utils.deepCopy(m[0]),
                                isRefresh: false
                            });
                            resolve(utils.deepCopy(m[0].info[key]));
                        }
                        else
                            reject(-10);
                    }
                }
                else
                    reject(-8);
            });
        };
        var writeRaw = function (key, value) {
            return new Promise(function (resolve, reject) {
                if (checkValid() == false) {
                    reject(-12);
                    return;
                }
                //if (utils.notNull(key)) {
                var m = utils.simple_array_filter(_this.infos, 'id', id);
                if (!m || m.length <= 0 || (m[0].period >= 0 && new Date().getTime() - m[0].timestamp > m[0].period * 1000)) {
                    _this._handler2(id, key, value, resolve, reject, false, 'raw');
                }
                else {
                    if (utils.notNull(key))
                        if (utils.notNull(m[0].raw)) {
                            m[0].raw[key] = utils.deepCopy(value);
                            _this.event.emit('dataChanged', {
                                action: 'renew',
                                id: id,
                                data: utils.deepCopy(m[0]),
                                isRefresh: false
                            });
                            //alert(321)
                            resolve(utils.deepCopy(m[0].raw[key]));
                        }
                        else
                            reject(-10);
                    else {
                        m[0].raw = utils.deepCopy(value);
                        resolve(utils.deepCopy(m[0].raw));
                    }
                }
                // }
                // else
                //     reject(-8)
            });
        };
        var writeByPath = function (key, value) {
            return new Promise(function (resolve, reject) {
                if (checkValid() == false) {
                    reject(-12);
                    return;
                }
                //if (utils.notNull(key)) {
                var m = utils.simple_array_filter(_this.infos, 'id', id);
                if (!m || m.length <= 0 || (m[0].period >= 0 && new Date().getTime() - m[0].timestamp > m[0].period * 1000)) {
                    _this._handler2(id, key, value, resolve, reject, false, 'raw', true);
                }
                else {
                    if (utils.notNull(key)) {
                        //if (utils.notNull(m[0].raw)) {
                        m[0].raw = _this.constructObj(m[0].raw, key, utils.deepCopy(value));
                        //m[0].raw[key] = this.utils.deepCopy(value);
                        _this.event.emit('dataChanged', {
                            action: 'renew',
                            id: id,
                            data: utils.deepCopy(m[0]),
                            isRefresh: false
                        });
                        //alert(321)
                        resolve(utils.deepCopy(value));
                        // }
                        // else
                        //     reject(-10);
                    }
                    else {
                        m[0].raw = _this.utils.deepCopy(value);
                        resolve(utils.deepCopy(m[0].raw));
                    }
                }
                // }
                // else
                //     reject(-8)
            });
        };
        var remove = function (key) {
            return new Promise(function (resolve, reject) {
                if (checkValid() == false) {
                    reject(-12);
                    return;
                }
                if (utils.notNull(key)) {
                    var m = utils.simple_array_filter(_this.infos, 'id', id);
                    if (!m || m.length <= 0 || (m[0].period >= 0 && new Date().getTime() - m[0].timestamp > m[0].period * 1000)) {
                        _this._handler2(id, key, null, resolve, reject, true, 'info');
                        //alert(123)
                    }
                    else {
                        if (utils.notNull(m[0].info)) {
                            delete m[0].info[key];
                            _this.event.emit('dataChanged', {
                                action: 'renew',
                                id: id,
                                data: utils.deepCopy(m[0]),
                                isRefresh: false
                            });
                            resolve(0);
                        }
                        else
                            reject(-10);
                    }
                }
                else
                    reject(-8);
            });
        };
        var removeRaw = function (key) {
            return new Promise(function (resolve, reject) {
                if (checkValid() == false) {
                    reject(-12);
                    return;
                }
                //if (utils.notNull(key)) {
                var m = utils.simple_array_filter(_this.infos, 'id', id);
                if (!m || m.length <= 0 || (m[0].period >= 0 && new Date().getTime() - m[0].timestamp > m[0].period * 1000)) {
                    _this._handler2(id, key, null, resolve, reject, true, 'raw');
                    //alert(123)
                }
                else {
                    if (utils.notNull(key))
                        if (utils.notNull(m[0].raw) && typeof m[0].raw == 'object' && m[0].raw != null) {
                            delete m[0].raw[key];
                            _this.event.emit('dataChanged', {
                                action: 'renew',
                                id: id,
                                data: utils.deepCopy(m[0]),
                                isRefresh: false
                            });
                            resolve(0);
                        }
                        else
                            reject(-10);
                    else {
                        m[0].raw = null;
                        _this.event.emit('dataChanged', {
                            action: 'renew',
                            id: id,
                            data: utils.deepCopy(m[0]),
                            isRefresh: false
                        });
                        resolve(0);
                    }
                }
                // }
                // else
                //     reject(-8)
            });
        };
        var removeByPath = function (key) {
            return new Promise(function (resolve, reject) {
                if (checkValid() == false) {
                    reject(-12);
                    return;
                }
                //if (utils.notNull(key)) {
                var m = utils.simple_array_filter(_this.infos, 'id', id);
                if (!m || m.length <= 0 || (m[0].period >= 0 && new Date().getTime() - m[0].timestamp > m[0].period * 1000)) {
                    _this._handler2(id, key, null, resolve, reject, true, 'raw', true);
                    //alert(123)
                }
                else {
                    if (utils.notNull(key)) {
                        var result = _this.deleteObj(m[0].raw, key);
                        if (result !== false) {
                            m[0].raw = result;
                            _this.event.emit('dataChanged', {
                                action: 'renew',
                                id: id,
                                data: utils.deepCopy(m[0]),
                                isRefresh: false
                            });
                            resolve(0);
                        }
                        else
                            reject(-10);
                    }
                    else {
                        m[0].raw = null;
                        _this.event.emit('dataChanged', {
                            action: 'renew',
                            id: id,
                            data: utils.deepCopy(m[0]),
                            isRefresh: false
                        });
                        resolve(0);
                    }
                }
                // }
                // else
                //     reject(-8)
            });
        };
        var refresh = function () {
            return new Promise(function (resolve, reject) {
                if (checkValid() == false) {
                    reject(-12);
                    return;
                }
                //console.log(this.configs)
                _refresher(id, null, resolve, reject, 'info');
            });
        };
        var _refresher = function (key, key2, resolve, reject, isRaw) {
            var infos = _this.infos, configs = _this.configs, utils = _this.utils, token = _this.token, event = _this.event, request_queue = _this.request_queue, enable = _this.enable;
            var config, method, _data, paths, index, flag = true;
            isRaw = utils.notNull(isRaw) ? isRaw : 'info';
            for (var c in configs) {
                config = configs[c];
                if (config.id != key)
                    continue;
                flag = false;
                // if (!utils.notnull3(config.bind_tokens_method)) {
                //   method = [];
                //   for (var y in config.bind_tokens)
                //     method.push(constants.tokenStorageMethod);
                // }
                // else
                //   method = config.bind_tokens_method;
                //
                // if (token.hasTokens(config.bind_tokens, method) == false) {
                //   deferred.reject(-1);
                //   return;
                // }
                request_queue.push(config.id);
                var requestPromise = void 0;
                if (config.request) {
                    requestPromise = _this.https.request(config.request);
                }
                else if (utils.notNull(config.localData)) {
                    if (config.localData instanceof Promise)
                        return config.localData;
                    else
                        requestPromise = function () {
                            return new Promise(function (_resolve, _reject) {
                                try {
                                    if (typeof config.localData == 'function') {
                                        var e = config.localData();
                                        if (e instanceof Promise) {
                                            e.then(function (w) { return _resolve({ data: w }); }, function (w) { return _reject(w); });
                                        }
                                        else
                                            _resolve({ data: config.localData() });
                                    }
                                    else
                                        _resolve({ data: config.localData });
                                }
                                catch (e) {
                                    _reject(e);
                                }
                            });
                        };
                    requestPromise = requestPromise();
                }
                else {
                    request_queue.splice(request_queue.indexOf(config.id), 1);
                    reject(-29);
                    return;
                }
                requestPromise.then(function (w) {
                    if (!timer)
                        clearTimeout(timer);
                    if (!utils.notBlankStrAndObj(w) /*|| !utils.notBlankStrAndObj(w.data)*/) {
                        request_queue.splice(request_queue.indexOf(config.id), 1);
                        reject(-4);
                        return;
                    }
                    var data = w.data;
                    if (utils.notBlankStr(config.condition_path)) {
                        _data = null;
                        if (config.condition_mode === 'header')
                            _data = w.header();
                        else
                            _data = data;
                        if (!_data) {
                            request_queue.splice(request_queue.indexOf(config.id), 1);
                            reject(-30);
                            return;
                        }
                        paths = config.condition_path.split('.');
                        for (var d in paths) {
                            if (paths[d].substr(0, 1) === '[' && paths[d].substr(paths[d].length - 1) === ']')
                                index = paths[d].substr(1, paths[d].length - 2);
                            else
                                index = paths[d];
                            if (typeof _data == 'object' && utils.notNull(_data[index]))
                                _data = _data[index];
                            else {
                                _data = null;
                                break;
                            }
                        }
                        if (utils.notNull(config.condition_value) && _data != config.condition_value) {
                            reject(-15);
                            request_queue.splice(request_queue.indexOf(config.id), 1);
                            return;
                        }
                        else if (!utils.notNull(config.condition_value) && !utils.notNull(_data)) {
                            reject(-20);
                            request_queue.splice(request_queue.indexOf(config.id), 1);
                            return;
                        }
                    }
                    _data = null;
                    paths = null;
                    if (config.receive_mode === 'header')
                        _data = w.header();
                    else
                        _data = data;
                    if (!_data) {
                        request_queue.splice(request_queue.indexOf(config.id), 1);
                        reject(-31);
                        return;
                    }
                    if (utils.notBlankStr(config.receive_path))
                        paths = config.receive_path.split('.');
                    // else
                    //   paths = ['data']
                    for (var d in paths) {
                        if (paths[d].substr(0, 1) === '[' && paths[d].substr(paths[d].length - 1) === ']')
                            index = paths[d].substr(1, paths[d].length - 2);
                        else
                            index = paths[d];
                        if (typeof _data == 'object' && utils.notNull(_data[index]))
                            _data = _data[index];
                        else {
                            _data = null;
                            break;
                        }
                    }
                    if (utils.notNull(_data)) {
                        var m = utils.simple_array_filter(infos, 'id', config.id);
                        if (m && m.length > 0)
                            infos.splice(infos.indexOf(m[0]), 1);
                        var info = {};
                        if (utils.notBlankStrAndObj(config.transform)) {
                            if (typeof config.transform != 'function') {
                                for (var r in config.transform) {
                                    var road = config.transform[r].split('.');
                                    var msg = _data;
                                    for (var d in road) {
                                        if (road[d].substr(0, 1) === '[' && road[d].substr(road[d].length - 1) === ']')
                                            index = road[d].substr(1, road[d].length - 2);
                                        else
                                            index = road[d];
                                        if (typeof msg == 'object' && utils.notNull(msg[index]))
                                            msg = msg[index];
                                        else {
                                            msg = null;
                                            break;
                                        }
                                    }
                                    if (utils.notNull(msg)) {
                                        info[r] = msg;
                                    }
                                }
                            }
                            else {
                                info = config.transform(_data);
                            }
                        }
                        if (m && m.length > 0) {
                            utils.mergeObject(info, m[0].info);
                            //utils.mergeObject(_data, m[0].raw);
                        }
                        if (enable == true) {
                            var _info = {
                                id: config.id,
                                raw: _data,
                                //info: utils.mergeObject(info, _data),
                                timestamp: new Date().getTime(),
                                period: config.period
                            };
                            infos.push(_info);
                            resolve(utils.deepCopy(_info));
                            event.emit('dataChanged', {
                                action: 'renew',
                                id: config.id,
                                data: utils.deepCopy(_info),
                                isRefresh: true
                            });
                        }
                        else {
                            reject(-2);
                        }
                    }
                    else
                        reject(-3);
                    request_queue.splice(request_queue.indexOf(config.id), 1);
                    //console.log(infos)
                }, function (w) {
                    if (!timer)
                        clearTimeout(timer);
                    request_queue.splice(request_queue.indexOf(config.id), 1);
                    reject(-5);
                });
                var sec;
                if (utils.notNullStrAndObj(config.timeout))
                    sec = config.timeout;
                else
                    sec = constants.httpRequestTimeout;
                if (sec >= 0)
                    var timer = setTimeout(function () {
                        if (request_queue.indexOf(config.id) >= 0)
                            request_queue.splice(request_queue.indexOf(config.id), 1);
                        reject(-6);
                    }, sec);
                break;
            }
            if (flag == true)
                reject(-7);
        };
        var onChange = function (cb, scope, immediate) {
            var d = _this.event.subscribe('dataChanged', function (ev, data) {
                if (data.id == id) {
                    cb(data);
                }
            });
            //var c;
            if (scope) {
                var _inner_1 = scope.ionViewWillUnload;
                if (_inner_1)
                    _inner_1 = _inner_1.bind(scope);
                scope.ionViewWillUnload = function () {
                    if (_inner_1)
                        _inner_1();
                    if (d) {
                        d.unsubscribe();
                        d = null;
                    }
                };
                // c = scope.subscribe('ionViewDidUnload', ()=> {
                //   if (d) {
                //     d.unsubscribe();
                //     d = null;
                //     c.unsubscribe();
                //     c = null;
                //   }
                // })
            }
            if (immediate != false) {
                try {
                    cb();
                }
                catch (e) {
                }
                //refresh();
            }
            return function () {
                if (d) {
                    d.unsubscribe();
                    d = null;
                }
                // if (c) {
                //   c.unsubscribe();
                //   c = null;
                // }
            };
        };
        return {
            //read: read.bind(this),
            read: readRaw.bind(this),
            readByPath: readByPath.bind(this),
            //write: write.bind(this),
            write: writeRaw.bind(this),
            writeByPath: writeByPath.bind(this),
            //remove: remove.bind(this),
            remove: removeRaw.bind(this),
            removeByPath: removeByPath.bind(this),
            refresh: refresh.bind(this),
            onChange: onChange.bind(this),
            checkValid: checkValid.bind(this)
        };
    };
    DataPool.prototype.constructObj = function (obj, path, value) {
        var paths = path == null ? [] : path.split('.'), index, index2, isArray, isArray2, first = true, org;
        if (paths.length > 0) {
            // if (paths[0].substr(0, 1) === '[' && paths[0].substr(paths[0].length - 1) === ']') {
            //   index = parseInt(paths[0].substr(1, paths[0].length - 2));
            //   isArray = true
            // }
            // else {
            //   index = paths[0];
            //   isArray = false
            // }
            for (var d = 0; d < paths.length; ++d) {
                index2 = index;
                isArray2 = isArray;
                if (paths[d].substr(0, 1) === '[' && paths[d].substr(paths[d].length - 1) === ']') {
                    index = parseInt(paths[d].substr(1, paths[d].length - 2));
                    isArray = true;
                }
                else {
                    index = paths[d];
                    isArray = false;
                }
                if (d == 0) {
                    if (isArray) {
                        if (!(obj instanceof Array))
                            obj = [];
                        if (obj.length <= index) {
                            var _l = obj.length;
                            for (var k = 0; k <= index - _l; ++k) {
                                obj[obj.length] = null;
                            }
                        }
                    }
                    else if (typeof obj != 'object' || obj == null || obj instanceof Array) {
                        obj = {};
                    }
                    org = obj;
                }
                else {
                    if (isArray) {
                        if (!(obj[index2] instanceof Array))
                            obj[index2] = [];
                        if (obj[index2].length <= index) {
                            var _l = obj[index2].length;
                            for (var k = 0; k <= index - _l; ++k) {
                                obj[index2][obj[index2].length] = null;
                            }
                            obj[index2][obj[index2].length - 1] = isArray ? [] : {};
                        }
                    }
                    else if (typeof obj[index2] != 'object' || obj[index2] == null || (obj[index2] instanceof Array)) {
                        obj[index2] = {};
                    }
                    //alert(JSON.stringify(obj)+index2)
                    obj = obj[index2];
                }
                //alert(JSON.stringify(obj))
                if (d == paths.length - 1) {
                    obj[index] = value;
                }
            }
            //obj[paths[paths.length - 1]] = value
        }
        else
            org = value;
        return org;
    };
    DataPool.prototype.deleteObj = function (obj, path) {
        if (path === void 0) { path = null; }
        var paths = path == null ? [] : path.split('.'), index, index2, isArray, isArray2, first = true, org;
        if (paths.length > 0) {
            for (var d = 0; d < paths.length; ++d) {
                index2 = index;
                isArray2 = isArray;
                if (paths[d].substr(0, 1) === '[' && paths[d].substr(paths[d].length - 1) === ']') {
                    index = parseInt(paths[d].substr(1, paths[d].length - 2));
                    isArray = true;
                }
                else {
                    index = paths[d];
                    isArray = false;
                }
                if (d == 0) {
                    if (isArray) {
                        if (!(obj instanceof Array))
                            return false;
                        if (obj.length <= index)
                            return false;
                    }
                    else if (typeof obj != 'object' || obj == null || obj instanceof Array)
                        return false;
                    org = obj;
                }
                else {
                    if (isArray) {
                        if (!(obj[index2] instanceof Array))
                            return false;
                        if (obj[index2].length <= index)
                            return false;
                    }
                    else if (typeof obj[index2] != 'object' || obj[index2] == null || (obj[index2] instanceof Array))
                        return false;
                    //alert(JSON.stringify(obj)+index2)
                    obj = obj[index2];
                }
                //alert(JSON.stringify(obj))
                if (d == paths.length - 1) {
                    if (isArray)
                        obj.splice(index, 1);
                    else
                        delete obj[index];
                    return org;
                }
            }
            //obj[paths[paths.length - 1]] = value
        }
        else {
            org = null;
            return org;
        }
    };
    DataPool.prototype.parseByPath = function (obj, path) {
        if (path === void 0) { path = null; }
        if (obj == null)
            return undefined;
        var paths = path == null ? [] : path.split('.'), index;
        for (var d in paths) {
            if (paths[d].substr(0, 1) === '[' && paths[d].substr(paths[d].length - 1) === ']')
                index = paths[d].substr(1, paths[d].length - 2);
            else
                index = paths[d];
            if (typeof obj == 'object' && obj[index] !== undefined)
                obj = obj[index];
            else {
                obj = undefined;
                break;
            }
        }
        return obj;
    };
    DataPool.prototype.refresh = function () {
        for (var c in this.infos) {
            try {
                this.request(this.infos[c].id).refresh();
            }
            catch (e) {
                console.log(e);
            }
        }
    };
    DataPool.prototype.onChange = function (cb, scope, immediate) {
        var d = this.event.subscribe('dataChanged', function (ev, data) {
            if (cb)
                cb(data);
        });
        //var c;
        if (scope) {
            var _inner_2 = scope.ionViewWillUnload;
            if (_inner_2)
                _inner_2 = _inner_2.bind(scope);
            scope.ionViewWillUnload = function () {
                if (_inner_2)
                    _inner_2();
                if (d) {
                    d.unsubscribe();
                    d = null;
                }
            };
            // c = scope.subscribe('ionViewDidUnload', ()=> {
            //   if (d) {
            //     d.unsubscribe();
            //     d = null;
            //     c.unsubscribe();
            //     c = null;
            //   }
            // })
        }
        if (immediate != false) {
            try {
                if (cb)
                    cb();
            }
            catch (e) {
            }
            //refresh();
        }
        return function () {
            if (d) {
                d.unsubscribe();
                d = null;
            }
            // if (c) {
            //   c.unsubscribe();
            //   c = null;
            // }
        };
    };
    return DataPool;
}());
DataPool.decorators = [
    { type: core_1.Injectable },
];
DataPool.ctorParameters = [
    { type: emiya_angular2_fetch_1.Fetch },
];
DataPool = __decorate([
    core_1.Injectable()
], DataPool);
exports.DataPool = DataPool;
//# sourceMappingURL=DataPool.js.map