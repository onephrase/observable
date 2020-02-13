
/**
 * @imports
 */
import _each from '@onephrase/commons/obj/each.js';

/**
 * ---------------------------
 * The Event class
 * ---------------------------
 */

const Event = class {

	/**
	 * Initializes an Event instance.
	 *
	 * @param object			params
	 *
	 * @return void
	 */
	constructor(params) {
		this.$ = {
			propagationStopped: false,
			defaultPrevented: false,
			promisesInstance: null,
			promises: [],
		};
		_each(params, (name, value) => {
			this[name] = value;
		});
	}

	/**
	 * Stops the evnt from reaching other listeners.
	 *
	 * @return bool
	 */
	stopPropagation() {
		this.$.propagationStopped = true;
	}
		
	/**
	 * (Readonly) tells if stopPropagation() has been called.
	 *
	 * @return bool
	 */
	get propagationStopped() {
		return this.$.propagationStopped;
	}
		
	/**
	 * Sets a disposition that asks event initiator not to
	 * proceed with default action.
	 *
	 * @return void
	 */
	preventDefault() {
		this.$.defaultPrevented = true;
	}
		
	/**
	 * (Readonly) tells if preventDefault() has been called.
	 *
	 * @return bool
	 */
	get defaultPrevented() {
		return this.$.defaultPrevented;
	}
		
	/**
	 * Sets a Promise disposition.
	 *
	 * @param Promise	promise
	 *
	 * @return void
	 */
	promise(promise) {
		if (!(promise instanceof Promise)) {
			throw new Error('Event.promise() must be called with a Promise.');
		}
		this.$.promises.push(promise);
		this.$.promisesInstance = null;
	}
		
	/**
	 * (Readonly) returns all promises.
	 *
	 * @return Promise|null
	 */
	get promises() {
		if (!this.$.promisesInstance && this.$.promises.length) {
			this.$.promisesInstance = Promise.all(this.$.promises);
		}
		return this.$.promisesInstance;
	}
};

/**
 * @exports
 */
export default Event;