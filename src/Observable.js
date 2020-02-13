
/**
 * @imports
 */
import _isNull from '@onephrase/commons/js/isNull.js';
import _isString from '@onephrase/commons/js/isString.js';
import _isArray from '@onephrase/commons/js/isArray.js';
import _isObject from '@onephrase/commons/js/isObject.js';
import _isNumber from '@onephrase/commons/js/isNumber.js';
import _isNumeric from '@onephrase/commons/js/isNumeric.js';
import _isFunction from '@onephrase/commons/js/isFunction.js';
import _isObservable from '@onephrase/commons/js/isObservable.js';
import _getProxyTarget from '@onephrase/commons/js/getProxyTarget.js';
import _isProxy from '@onephrase/commons/js/isProxy.js';
import _proxy from '@onephrase/commons/js/proxy.js';
import _arrFrom from '@onephrase/commons/arr/from.js';
import _unique from '@onephrase/commons/arr/unique.js';
import _inherit from '@onephrase/commons/obj/inherit.js';
import _copy from '@onephrase/commons/obj/copy.js';
import _each from '@onephrase/commons/obj/each.js';
import _even from '@onephrase/commons/obj/even.js';
import _get from '@onephrase/commons/obj/get.js';
import EventController from './EventController.js';

/**
 * ---------------------------
 * The Observable
 * ---------------------------
 */
 
const Observable = class extends EventController {

	/**
	 * Handles initializations.
	 *
	 * @param object			state
	 * @param object			params
	 *
	 * @return void
	 */
	constructor(state = {}, params = {}) {
		super();
		// @see ObservableCore.init()
		this.$.params = _inherit({}, params, Observable.params);
		this.$.bubblers = {};
		this.$.state = state;
		this.$._state = _isArray(state) ? state.slice() : _copy(1, state);
		_each(this.$.state, (prop, value) => {
			this._incoming(prop, value);
		});
	}

	/**
	 * Alias of addListener.
	 *
	 * @see addListener()
	 */
	observe(...args) {
		return this.addListener(...args);
	}

	/**
	 * Alias of removeListener.
	 *
	 * @see removeListener()
	 */
	unobserve(...args) {
		return this.removeListener(...args);
	}

	/**
	 * Pushes data into a given property, or list of properties.
	 *
	 * @param string		props
	 * @param mixed			value
	 *
	 * @return null|false|Promise
	 */
	set(prop, value) {
		var data = {};
		if (_isString(prop) || _isNumber(prop)) {
			data[prop] = value;
		} else if (_isArray(prop)) {
			prop.forEach(p => {
				data[p] = value;
			})
		} else if (_isObject(prop)) {
			data = prop;
		}
		var changedProps = Object.keys(data);
		if (_isArray(this.$.state)) {
			changedProps = changedProps.map(key => parseInt(key));
		}
		// ------------------
		var entries = [];
		changedProps.forEach(prop => {
			if (prop in this.$.state) {
				this._outgoing(prop, this.$.state[prop]);
			} else {
				entries.push(prop);
			}
			// Incoming...
			// ------------------
			var value = data[prop];
			// When observables come as proxies,
			// we'll save them real
			if (_isProxy(value)) {
				var _value = _getProxyTarget(value);
				if (_isObservable(_value)) {
					value = _value;
				}
			}
			this._incoming(prop, value);
			// Set now...
			// ------------------
			this.$.state[prop] = value;
		});
		var observersDisposition = this.fire(changedProps, {context: this.$.state, _context: this.$._state, entries: entries, exits: []});
		changedProps.forEach(prop => {
			this.$._state[prop] = this.$.state[prop];
		});
		return observersDisposition;
	}

	/**
	 * Unsets the property or list of properties from the object.
	 *
	 * @param string|array		prop
	 *
	 * @return null|false|Promise
	 */
	del(prop) {
		var props = _arrFrom(prop);
		var exits = [];
		props.forEach(prop => {
			if (prop in this.$.state) {
				exits.push(prop);
				this._outgoing(prop, this.$.state[prop]);
			}
			delete this.$.state[prop];
		});
		var observersDisposition = this.fire(props, {context: this.$.state, _context: this.$._state, entries: [], exits: exits});
		props.forEach(prop => {
			delete this.$._state[prop];
		});
		return observersDisposition;
	}

	/**
	 * Evaluates a property name to see if it's a request for instance method
	 * as against state property.
	 *
	 * @param string			prop
	 *
	 * @return function|undefined
	 */
	asOwnMethod(prop) {
		if (_isString(prop) && this.$.params.methodPrefix && prop.startsWith(this.$.params.methodPrefix)) {
			var ownMethod = prop.substr(this.$.params.methodPrefix.length);
			if (ownMethod && _isFunction(ownMethod = this[ownMethod])) {
				return ownMethod.bind(this);
			}
		}
	}
	
	/**
	 * Returns a field's value.
	 *
	 * @param string|int 		prop
	 *
	 * @return mixed
	 */
	get(prop) {
		// ----------------------
		var asOwnMethod = this.asOwnMethod(prop);
		if (asOwnMethod) {
			return asOwnMethod;
		}
		// ----------------------
		var value = this.$.state[prop];
		if (_isArray(this.$.state) && !_isNumeric(prop) && _isFunction(value)) {
			return (...args) => {
				var copy = this.$.state.slice();
				var ret = value.apply(this.$.state, args);
				var changedKeys = _unique(Object.keys(copy).concat(Object.keys(this.$.state))).filter(k => {
					k = parseInt(k);
					if (this.$.state[k] !== copy[k]) {
						if (!(k in this.$.state)) {
							// Outgoing...
							// ------------------
							this._outgoing(k, copy[k]);
						} else {
							// Incoming...
							// ------------------
							this._incoming(k, this.$.state[k]);
						}
						return true;
					}
				});
				if (changedKeys.length) {
					this.fire(changedKeys, {context: this.$.state, _context: this.$._state});
					this.$._state = this.$.state.slice();
				}
				return ret;
			};
		}
		return value;
	}
	
	/**
	 * Tells if a a field exists.
	 *
	 * @param string|int 		prop
	 *
	 * @return bool
	 */
	has(prop) {
		return (prop in this.$.state);
	}
	
	/**
	 * Keys of current entries.
	 *
	 * @return array
	 */
	keys() {
		return Object.keys(this.$.state);
	}
	
	/**
	 * Determins if to fire the listener at entry "i".
	 * Returns a data object if so.
	 *
	 * @param object		 	listener
	 * @param array			 	eventNames
	 * @param object 			e
	 *
	 * @return bool
	 */
	_shouldFire(listener, eventNames, e) {
		var passes = 0, failures = 0;
		// One CACHE across listeners
		// IMPORTANT: This cache must
		// be destroyed before bubbling the (e) object
		if (!('CACHE' in e.$)) {
			e.$.CACHE = {};
			e.$._CACHE = {};
		}
		var listenerParams = listener.params || {};
		(!_isNull(listener.eventNames) ? _arrFrom(listener.eventNames) : eventNames).forEach(prop => {
			if (!(prop in e.$.CACHE)) {
				e.$.CACHE[prop] = {};
				e.$._CACHE[prop] = {};
				// > ACCESS
				var existsReciever = {};
				var _existsReciever = {};
				var path = _isString(prop) ? prop.split('.') : prop;
				e.$.CACHE[prop].val = _get(e.context, path, existsReciever);
				e.$._CACHE[prop].val = _get(e._context, path, _existsReciever);
				e.$.CACHE[prop].existence = existsReciever.exists;
				e.$._CACHE[prop].existence = _existsReciever.exists;
				// > DIFFING
				if (listenerParams.diff !== false && !('diffing' in e.$.CACHE[prop])) {
					e.$.CACHE[prop].diffing = e.bubbling
					|| e.$.CACHE[prop].existence !== e.$._CACHE[prop].existence 
					|| (_isObject(e.$.CACHE[prop].val) && _isObject(e.$._CACHE[prop].val) 
						? !_even(e.$.CACHE[prop].val, e.$._CACHE[prop].val) 
						: e.$.CACHE[prop].val !== e.$._CACHE[prop].val);
				}
			}
			// > Delta...
			if (_isNumeric(listenerParams.pulse) && e.context && e._context) {
				if (listenerParams.pulse === 0 && e.$.CACHE[prop].val && !e.$._CACHE[prop].val) {
					failures ++;
				} else if (listenerParams.pulse === 1 && !e.$.CACHE[prop].val && e.$._CACHE[prop].val) {
					failures ++;
				}
			}
			// > Diff...
			if (listenerParams.diff === false || e.$.CACHE[prop].diffing) {
				passes ++;
			}
		});
		return !failures && passes && super._shouldFire(listener, eventNames, e);
	}

	/**
	 * A function that captures outgoing objects/values.
	 *
	 * @param string		prop
	 * @param mixed			value
	 *
	 * @return void
	 */
	_outgoing(prop, value) {
		if (_isObservable(value)) {
			if (prop in this.$.bubblers) {
				value.unobserve(this.$.bubblers[prop], {allowBubbling:true});
			}
			if (_isFunction(value.getOffsetParent) && value.getOffsetParent() === this) {
				value.setOffsetParent(null);
			}
		}
	}

	/**
	 * A function that captures incoming objects/values.
	 *
	 * @param string		prop
	 * @param mixed			value
	 *
	 * @return void
	 */
	_incoming(prop, value) {
		if (_isObservable(value)) {
			value.observe(this._getBubbler(prop), {allowBubbling:true});
			if (_isFunction(value.getOffsetParent) && !value.getOffsetParent()) {
				value.setOffsetParent(this);
			}
		}
	}

	/**
	 * Sets a reference to the parent instance.
	 *
	 * @param object|null		offsetParent
	 *
	 * @return this
	 */
	setOffsetParent(offsetParent) {
		this.$.offsetParent = offsetParent;
	}

	/**
	 * Sets a reference to the parent instance.
	 *
	 * @return object|null
	 */
	getOffsetParent() {
		return this.$.offsetParent;
	}

	/**
	 * Creates a function that observes changes in child observables and bubble them up here.
	 *
	 * @param string		name
	 *
	 * @return function
	 */
	_getBubbler(prop) {
		this.$.bubblers = this.$.bubblers || {};
		this.$.bubblers[prop] = (changes, _changes, e) => {
			var _e = {};
			_e.context = this.$.state;
			_e._context = this.$._state;
			_e.entries = (e.entries || []).slice();
			_e.exits = (e.exits || []).slice();
			_e.bubbling = (e.bubbling ? _arrFrom(e.bubbling) : Object.keys(changes))
				.map(subFieldName => prop + '.' + subFieldName);
			return this.fire(prop, _e);
		};
		return this.$.bubblers[prop];
	}
	
	/**
	 * Warning handler.
	 *
	 * @param string		msg
	 *
	 * @return void
	 */
	warn(msg) {
		console.error(msg);
	}
	
	/**
	 * Error handler.
	 *
	 * @param string		msg
	 *
	 * @return void
	 */
	error(msg) {
		if (this.$.params.strictDebug) {
			throw new Error(msg);
		} else {
			console.error(msg);
		}
	}
	
	/**
	 * Constructs a proxy wrapper for the target.
	 *
	 * @return new Proxy
	 */
	proxy() {
		return _proxy(this, {
			// -----------------------
			// The 4 cardinal points...
			// -----------------------
			get: function(target, prop) {
				var value = target.get(prop);
				if (_isObject(value) && _isFunction(value.proxy)) {
					value = value.proxy();
				}
				return value;
			},
			set: function(target, prop, val) {
				target.set(prop, val);
				return true;
			},
			has: function(target, prop) {
				return target.has(prop);
			},
			deleteProperty: function(target, prop) {
				return target.del(prop);
			},
			// -----------------------
			// Unimportant additions...
			// -----------------------
			ownKeys: function(target) {
				//TODO:return Reflect.ownKeys(target.$.state);
				return Object.keys(target.$.state);
			},
			defineProperty: function(target, prop, descriptor) {
				Object.defineProperty(target.$.state, prop, descriptor);
				target.set(prop, target.$.state[prop]);
				return true;
			},
			getOwnPropertyDescriptor: function(target, prop) {
				return Object.getOwnPropertyDescriptor(target.$.state, prop);
			},
			getOwnPropertySymbols: function(target) {
				return Object.getOwnPropertySymbols(target.$.state);
			},
			getOwnPropertyNames: function(target) {
				return Object.getOwnPropertyNames(target.$.state);
			},
		});
	}
};

/**
 * @var object
 */
Observable.params = {
	methodPrefix: '$',
}

/**
 * @exports
 */
export default Observable;