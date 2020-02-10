
/**
 * @imports
 */
import {
	_each
} from '@onephrase/commons/src/Obj.js';

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
			isPropagationStopped: false,
			isDefaultPrevented: false,
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
		this.$.isPropagationStopped = true;
	}
		
	/**
	 * (Readonly) tells if stopPropagation() has been called.
	 *
	 * @return bool
	 */
	get isPropagationStopped() {
		return this.$.isPropagationStopped;
	}
		
	/**
	 * Sets a disposition that asks event initiator not to
	 * proceed with default action.
	 *
	 * @return void
	 */
	preventDefault() {
		this.$.isDefaultPrevented = true;
	}
		
	/**
	 * (Readonly) tells if preventDefault() has been called.
	 *
	 * @return bool
	 */
	get isDefaultPrevented() {
		return this.$.isDefaultPrevented;
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
	}
		
	/**
	 * (Readonly) returns all promises.
	 *
	 * @return Promise|null
	 */
	get promises() {
		return this.$.promises.length ? Promise.all(this.$.promises) : null;
	}
};

/**
 * @exports
 */
export default Event;