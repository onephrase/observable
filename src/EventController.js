
/**
 * @imports
 */
import _even from '@onephrase/commons/obj/even.js';
import _get from '@onephrase/commons/obj/get.js';
import _remove from '@onephrase/commons/arr/remove.js';
import _concatUnique from '@onephrase/commons/arr/concatUnique.js';
import _arrFrom from '@onephrase/commons/arr/from.js';
import _difference from '@onephrase/commons/arr/difference.js';
import _intersect from '@onephrase/commons/arr/intersect.js';
import _exclude from '@onephrase/commons/arr/exclude.js';
import _isNull from '@onephrase/commons/js/isNull.js';
import _isFunction from '@onephrase/commons/js/isFunction.js';
import _getType from '@onephrase/commons/js/getType.js';
import _isString from '@onephrase/commons/js/isString.js';
import _isArray from '@onephrase/commons/js/isArray.js';
import Event from './Event.js';

/**
 * ---------------------------
 * The Reactive class
 * ---------------------------
 */

const EventController = class {
	
	/**
	 * Initializes the instance.
	 *
	 * @return void
	 */
	constructor() {
		this.$ = {
			listeners: [],
		};
	}
	
	/**
	 * Creates a listener object.
	 *
	 * @param string|array		eventNames
	 * @param function			callback
	 * @param object			params
	 * @param string			tag
	 *
	 * @return void
	 */
	addListener(eventNames, callback, params = {}, tag = null) {
		if (_isFunction(eventNames)) {
			tag = arguments.length > 2 ? params : '';
			params = callback;
			callback = eventNames;
			eventNames = null;
		}
		if (!_isFunction(callback)) {
			throw new Error('Callback must be a function; "' + _getType(callback) + '" given!');
		}
		var listener = {
			eventNames: eventNames, 
			callback: callback, 
			params: params,
			tag: tag,
			remove: () => {
				_remove(this.$.listeners, listener);
			},
		};
		this.$.listeners.push(listener);
		return listener;
	}

	/**
	 * Unregisters an listener.
	 *
	 * @param string|array		eventNames
	 * @param function			callback
	 * @param object			params
	 * @param string			tag
	 *
	 * @return bool
	 */
	removeListener(eventNames, callback = null, params = {}, tag = null) {
		if (_isFunction(eventNames)) {
			tag = arguments.length > 2 ? params : '';
			params = callback || {};
			callback = eventNames;
			eventNames = null;
		}
		var success = false;
		for (var i = 0; i < this.$.listeners.length; i ++) {
			if ((_isNull(eventNames) || _even(_arrFrom(this.$.listeners[i].eventNames), _arrFrom(eventNames))) 
			&& (_isNull(callback) || this.$.listeners[i].callback === callback)
			&& (_isNull(params) || _even(this.$.listeners[i].params, params))
			&& (_isNull(tag) || this.$.listeners[i].tag === tag)) {
				if (this.$.listeners[i].removeCallback) {
					this.$.listeners[i].removeCallback();
				}
				this.$.listeners[i].remove();
				success = true;
			}
		}
		return success;
	}
		
	/**
	 * Returns the list of params being listend.
	 *
	 * @return array
	 */
	eventsAll() {
		var eventsAll = [];
		(this.$.listeners || []).forEach(listener => {
			if (!_isNull(listener.eventNames)) {
				eventsAll = _concatUnique(eventsAll, _arrFrom(listener.eventNames));
			}
		});
		return eventsAll;
	}
	
	/**
	 * Fires listeners that are bound to the given events.
	 *
	 * @param string|array	 	eventNames
	 * @param object 			details
	 *
	 * @return bool|Promise
	 */
	fire(eventNames, details) {
		var e = details instanceof Event ? details : new Event(details);
		// We handle multiple events actually...
		eventNames = _arrFrom(eventNames);
		// And fields already firing should trigger a refire
		this.$.currentlyFiring = this.$.currentlyFiring || [];
		var eventNamesAntiRecursion = _difference(eventNames, this.$.currentlyFiring);
		if (!eventNamesAntiRecursion.length) {
			return;
		}
		_concatUnique(this.$.currentlyFiring, eventNamesAntiRecursion)
		// Initialize evteters for "return"
		for (var i = 0; i < (this.$.listeners || []).length; i ++) {
			if (e.propagationStopped) {
				continue;
			}
			var listener = this.$.listeners[i];
			var listenerParams = listener.params || {};
			var listenerEventNames = _arrFrom(listener.eventNames).map(str => str.replace(/\`/g, ''));
			// --------------------------
			// Level-1 filtering...
			// Match listenerEventNames to firingEventNames
			// --------------------------
			var matches;
			if (listenerEventNames.length) {
				matches = listenerEventNames.filter(listenerEventName => {
					var firingEventNames = e.bubbling && listenerEventName.indexOf('.') > -1 ? e.bubbling
						: (!e.bubbling || listenerParams.allowBubbling ? eventNamesAntiRecursion : []);
					return firingEventNames.filter(firingEventName => (listenerEventName + '.').startsWith(firingEventName + '.')).length;
				}).length;
			} else {
				matches = !e.bubbling || listenerParams.allowBubbling;
			}
			// --------------------------
			// Level-2 filtering...
			// --------------------------
			if (matches && this._shouldFire(listener, eventNames, e)) {
				// Call listener...
				var dispostn = this._doFire(listener, eventNames, e), proms;
				if ((dispostn === false) || (dispostn instanceof Event && dispostn.propagationStopped)) {
					e.stopPropagation();
				} else if ((dispostn === false) || (dispostn instanceof Event && dispostn.defaultPrevented)) {
					e.preventDefault();
				} else if ((dispostn instanceof Promise && (proms = dispostn))
				|| (dispostn instanceof Event && (proms = dispostn.promises))) {
					e.promise(proms);
				}
			}
		}
		_exclude(this.$.currentlyFiring, ...eventNamesAntiRecursion)
		// -----------------------------
		// The overall return value
		// -----------------------------
		return e;
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
		return true;
	}

	/**
	 * Fires the listener at entry "i".
	 * Returns listener's disposition.
	 *
	 * @param object		 	listener
	 * @param array			 	eventNames
	 * @param object 			e
	 *
	 * @return null|false|Promise
	 */
	_doFire(listener, eventNames, e) {
		var context = e.context || {};
		var _context = e._context || {};
		if (!_isNull(listener.eventNames)) {
			// Call listener...
			var data = [];
			var _data = [];
			var result = _arrFrom(listener.eventNames).forEach(eventName => {
				eventName = _isString(eventName) ? eventName.split('.') : eventName;
				data.push(_get(context, eventName));
				_data.push(_get(_context, eventName));
			});
			return _isArray(listener.eventNames) 
				? listener.callback(data, _data, e)
				: listener.callback(data[0], _data[0], e);
		}
		var data = {};
		var _data = {};
		eventNames.forEach(eventName => {
			var path = _isString(eventName) ? eventName.split('.') : eventName;
			data[eventName] = _get(context, path);
			_data[eventName] = _get(_context, path);
		});
		// Call listener...
		return listener.callback(data, _data, e);
	}
};

/**
 * @exports
 */
export default EventController;