
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var main = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(anchor = null) {
            this.a = anchor;
            this.e = this.n = null;
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.h(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.35.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/MaterialIcon.svelte generated by Svelte v3.35.0 */

    const file = "src/components/MaterialIcon.svelte";

    function create_fragment(ctx) {
    	let span;
    	let t;
    	let span_class_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*icon*/ ctx[0]);
    			attr_dev(span, "class", span_class_value = "material-icons notranslate " + /*size*/ ctx[1] + " svelte-1scgaz4");
    			attr_dev(span, "translate", "no");
    			attr_dev(span, "title", /*alt*/ ctx[2]);
    			add_location(span, file, 6, 0, 94);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*icon*/ 1) set_data_dev(t, /*icon*/ ctx[0]);

    			if (dirty & /*size*/ 2 && span_class_value !== (span_class_value = "material-icons notranslate " + /*size*/ ctx[1] + " svelte-1scgaz4")) {
    				attr_dev(span, "class", span_class_value);
    			}

    			if (dirty & /*alt*/ 4) {
    				attr_dev(span, "title", /*alt*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("MaterialIcon", slots, []);
    	let { icon = "" } = $$props;
    	let { size = "" } = $$props;
    	let { alt = "" } = $$props;
    	const writable_props = ["icon", "size", "alt"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MaterialIcon> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("icon" in $$props) $$invalidate(0, icon = $$props.icon);
    		if ("size" in $$props) $$invalidate(1, size = $$props.size);
    		if ("alt" in $$props) $$invalidate(2, alt = $$props.alt);
    	};

    	$$self.$capture_state = () => ({ icon, size, alt });

    	$$self.$inject_state = $$props => {
    		if ("icon" in $$props) $$invalidate(0, icon = $$props.icon);
    		if ("size" in $$props) $$invalidate(1, size = $$props.size);
    		if ("alt" in $$props) $$invalidate(2, alt = $$props.alt);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [icon, size, alt];
    }

    class MaterialIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { icon: 0, size: 1, alt: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MaterialIcon",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get icon() {
    		throw new Error("<MaterialIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icon(value) {
    		throw new Error("<MaterialIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<MaterialIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<MaterialIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get alt() {
    		throw new Error("<MaterialIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set alt(value) {
    		throw new Error("<MaterialIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Header.svelte generated by Svelte v3.35.0 */
    const file$1 = "src/components/Header.svelte";

    // (17:4) {:else}
    function create_else_block(ctx) {
    	let div;
    	let a;
    	let img;
    	let img_src_value;
    	let t0;
    	let h3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			img = element("img");
    			t0 = space();
    			h3 = element("h3");
    			h3.textContent = "Library Publishing Map of the World";
    			if (img.src !== (img_src_value = "images/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "IFLA logo");
    			add_location(img, file$1, 18, 43, 516);
    			attr_dev(a, "href", "https://www.ifla.org");
    			add_location(a, file$1, 18, 12, 485);
    			attr_dev(h3, "class", "title is-5 svelte-j4epfv");
    			attr_dev(h3, "id", "title");
    			add_location(h3, file$1, 19, 12, 578);
    			attr_dev(div, "class", "header-bar svelte-j4epfv");
    			add_location(div, file$1, 17, 8, 448);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, img);
    			append_dev(div, t0);
    			append_dev(div, h3);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(17:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (12:4) {#if innerWidth > 768}
    function create_if_block(ctx) {
    	let div;
    	let a;
    	let img;
    	let img_src_value;
    	let t0;
    	let h3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			img = element("img");
    			t0 = space();
    			h3 = element("h3");
    			h3.textContent = "Library Publishing Map of the World";
    			if (img.src !== (img_src_value = "images/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "IFLA logo");
    			add_location(img, file$1, 13, 43, 276);
    			attr_dev(a, "href", "https://www.ifla.org");
    			add_location(a, file$1, 13, 12, 245);
    			attr_dev(h3, "class", "title is-3 svelte-j4epfv");
    			attr_dev(h3, "id", "title");
    			add_location(h3, file$1, 14, 12, 338);
    			attr_dev(div, "class", "header-bar svelte-j4epfv");
    			add_location(div, file$1, 12, 8, 208);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, img);
    			append_dev(div, t0);
    			append_dev(div, h3);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(12:4) {#if innerWidth > 768}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let header;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowresize*/ ctx[1]);

    	function select_block_type(ctx, dirty) {
    		if (/*innerWidth*/ ctx[0] > 768) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			header = element("header");
    			if_block.c();
    			add_location(header, file$1, 10, 0, 164);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			if_block.m(header, null);

    			if (!mounted) {
    				dispose = listen_dev(window, "resize", /*onwindowresize*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(header, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Header", slots, []);
    	let innerWidth;
    	let opened = true;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	function onwindowresize() {
    		$$invalidate(0, innerWidth = window.innerWidth);
    	}

    	$$self.$capture_state = () => ({ MaterialIcon, innerWidth, opened });

    	$$self.$inject_state = $$props => {
    		if ("innerWidth" in $$props) $$invalidate(0, innerWidth = $$props.innerWidth);
    		if ("opened" in $$props) opened = $$props.opened;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [innerWidth, onwindowresize];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src/components/AboutMessage.svelte generated by Svelte v3.35.0 */

    const file$2 = "src/components/AboutMessage.svelte";

    function create_fragment$2(ctx) {
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let h20;
    	let t5;
    	let p0;
    	let t7;
    	let h21;
    	let t9;
    	let p1;
    	let t11;
    	let h22;
    	let t13;
    	let p2;
    	let t15;
    	let p3;
    	let t17;
    	let h23;
    	let t19;
    	let p4;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text("🎉 ");
    			t1 = text(/*message*/ ctx[0]);
    			t2 = text(" 🍾");
    			t3 = space();
    			h20 = element("h2");
    			h20.textContent = "What is Lorem Ipsum?";
    			t5 = space();
    			p0 = element("p");
    			p0.textContent = "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.";
    			t7 = space();
    			h21 = element("h2");
    			h21.textContent = "Why do we use it?";
    			t9 = space();
    			p1 = element("p");
    			p1.textContent = "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).";
    			t11 = space();
    			h22 = element("h2");
    			h22.textContent = "Where does it come from?";
    			t13 = space();
    			p2 = element("p");
    			p2.textContent = "Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of \"de Finibus Bonorum et Malorum\" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, \"Lorem ipsum dolor sit amet..\", comes from a line in section 1.10.32.";
    			t15 = space();
    			p3 = element("p");
    			p3.textContent = "The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from \"de Finibus Bonorum et Malorum\" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.";
    			t17 = space();
    			h23 = element("h2");
    			h23.textContent = "Where can I get some?";
    			t19 = space();
    			p4 = element("p");
    			p4.textContent = "There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc.";
    			attr_dev(h1, "class", "svelte-1683fyu");
    			add_location(h1, file$2, 15, 0, 145);
    			attr_dev(h20, "class", "svelte-1683fyu");
    			add_location(h20, file$2, 17, 0, 171);
    			add_location(p0, file$2, 18, 0, 201);
    			attr_dev(h21, "class", "svelte-1683fyu");
    			add_location(h21, file$2, 20, 0, 784);
    			add_location(p1, file$2, 21, 0, 811);
    			attr_dev(h22, "class", "svelte-1683fyu");
    			add_location(h22, file$2, 23, 0, 1433);
    			add_location(p2, file$2, 24, 0, 1467);
    			add_location(p3, file$2, 25, 0, 2238);
    			attr_dev(h23, "class", "svelte-1683fyu");
    			add_location(h23, file$2, 27, 0, 2542);
    			add_location(p4, file$2, 28, 0, 2573);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, h22, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, h23, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p4, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*message*/ 1) set_data_dev(t1, /*message*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(h20);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(h21);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(h22);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(p3);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(h23);
    			if (detaching) detach_dev(t19);
    			if (detaching) detach_dev(p4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AboutMessage", slots, []);
    	let { message } = $$props;
    	const writable_props = ["message"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AboutMessage> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("message" in $$props) $$invalidate(0, message = $$props.message);
    	};

    	$$self.$capture_state = () => ({ message });

    	$$self.$inject_state = $$props => {
    		if ("message" in $$props) $$invalidate(0, message = $$props.message);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [message];
    }

    class AboutMessage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { message: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AboutMessage",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*message*/ ctx[0] === undefined && !("message" in props)) {
    			console.warn("<AboutMessage> was created without expected prop 'message'");
    		}
    	}

    	get message() {
    		throw new Error("<AboutMessage>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set message(value) {
    		throw new Error("<AboutMessage>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/CloseButton.svelte generated by Svelte v3.35.0 */

    const file$3 = "src/components/CloseButton.svelte";

    function create_fragment$3(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Custom Close Button";
    			attr_dev(button, "class", "svelte-1o4owg5");
    			add_location(button, file$3, 16, 0, 259);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*onClose*/ ctx[0])) /*onClose*/ ctx[0].apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CloseButton", slots, []);
    	let { onClose } = $$props;
    	const writable_props = ["onClose"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CloseButton> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("onClose" in $$props) $$invalidate(0, onClose = $$props.onClose);
    	};

    	$$self.$capture_state = () => ({ onClose });

    	$$self.$inject_state = $$props => {
    		if ("onClose" in $$props) $$invalidate(0, onClose = $$props.onClose);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [onClose];
    }

    class CloseButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { onClose: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CloseButton",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*onClose*/ ctx[0] === undefined && !("onClose" in props)) {
    			console.warn("<CloseButton> was created without expected prop 'onClose'");
    		}
    	}

    	get onClose() {
    		throw new Error("<CloseButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onClose(value) {
    		throw new Error("<CloseButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/AboutBox.svelte generated by Svelte v3.35.0 */
    const file$4 = "src/components/AboutBox.svelte";

    function create_fragment$4(ctx) {
    	let section;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			section = element("section");
    			button = element("button");
    			button.textContent = "About ...";
    			attr_dev(button, "size", "large");
    			add_location(button, file$4, 37, 1, 618);
    			attr_dev(section, "class", "svelte-kixxzo");
    			add_location(section, file$4, 35, 0, 606);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*showAboutMessage*/ ctx[0], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AboutBox", slots, []);
    	const { open } = getContext("simple-modal");
    	let opening = false;
    	let opened = false;
    	let closing = false;
    	let closed = false;

    	const showAboutMessage = () => {
    		open(AboutMessage, { message: "It's a popup with long text!" });
    	};

    	let name;
    	let status = 0;

    	const onCancel = text => {
    		name = "";
    		status = -1;
    	};

    	const onOkay = text => {
    		name = text;
    		status = 1;
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AboutBox> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		getContext,
    		fly,
    		AboutMessage,
    		CloseButton,
    		open,
    		opening,
    		opened,
    		closing,
    		closed,
    		showAboutMessage,
    		name,
    		status,
    		onCancel,
    		onOkay
    	});

    	$$self.$inject_state = $$props => {
    		if ("opening" in $$props) opening = $$props.opening;
    		if ("opened" in $$props) opened = $$props.opened;
    		if ("closing" in $$props) closing = $$props.closing;
    		if ("closed" in $$props) closed = $$props.closed;
    		if ("name" in $$props) name = $$props.name;
    		if ("status" in $$props) status = $$props.status;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [showAboutMessage];
    }

    class AboutBox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AboutBox",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/Modal.svelte generated by Svelte v3.35.0 */
    const file$5 = "src/components/Modal.svelte";
    const get_header_slot_changes = dirty => ({});
    const get_header_slot_context = ctx => ({});

    function create_fragment$5(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let hr0;
    	let t2;
    	let t3;
    	let hr1;
    	let t4;
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	const header_slot_template = /*#slots*/ ctx[4].header;
    	const header_slot = create_slot(header_slot_template, ctx, /*$$scope*/ ctx[3], get_header_slot_context);
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			if (header_slot) header_slot.c();
    			t1 = space();
    			hr0 = element("hr");
    			t2 = space();
    			if (default_slot) default_slot.c();
    			t3 = space();
    			hr1 = element("hr");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Okay";
    			attr_dev(div0, "class", "modal-background svelte-1k3utew");
    			add_location(div0, file$5, 41, 0, 890);
    			add_location(hr0, file$5, 45, 1, 1045);
    			add_location(hr1, file$5, 47, 1, 1066);
    			button.autofocus = true;
    			attr_dev(button, "class", "svelte-1k3utew");
    			add_location(button, file$5, 50, 1, 1112);
    			attr_dev(div1, "class", "modal svelte-1k3utew");
    			attr_dev(div1, "role", "dialog");
    			attr_dev(div1, "aria-modal", "true");
    			add_location(div1, file$5, 43, 0, 945);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);

    			if (header_slot) {
    				header_slot.m(div1, null);
    			}

    			append_dev(div1, t1);
    			append_dev(div1, hr0);
    			append_dev(div1, t2);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			append_dev(div1, t3);
    			append_dev(div1, hr1);
    			append_dev(div1, t4);
    			append_dev(div1, button);
    			/*div1_binding*/ ctx[5](div1);
    			current = true;
    			button.focus();

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "keydown", /*handle_keydown*/ ctx[2], false, false, false),
    					listen_dev(div0, "click", /*close*/ ctx[1], false, false, false),
    					listen_dev(button, "click", /*close*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (header_slot) {
    				if (header_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(header_slot, header_slot_template, ctx, /*$$scope*/ ctx[3], dirty, get_header_slot_changes, get_header_slot_context);
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header_slot, local);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header_slot, local);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (header_slot) header_slot.d(detaching);
    			if (default_slot) default_slot.d(detaching);
    			/*div1_binding*/ ctx[5](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Modal", slots, ['header','default']);
    	const dispatch = createEventDispatcher();
    	const close = () => dispatch("close");
    	let modal;

    	const handle_keydown = e => {
    		if (e.key === "Escape") {
    			close();
    			return;
    		}

    		if (e.key === "Tab") {
    			// trap focus
    			const nodes = modal.querySelectorAll("*");

    			const tabbable = Array.from(nodes).filter(n => n.tabIndex >= 0);
    			let index = tabbable.indexOf(document.activeElement);
    			if (index === -1 && e.shiftKey) index = 0;
    			index += tabbable.length + (e.shiftKey ? -1 : 1);
    			index %= tabbable.length;
    			tabbable[index].focus();
    			e.preventDefault();
    		}
    	};

    	const previously_focused = typeof document !== "undefined" && document.activeElement;

    	if (previously_focused) {
    		onDestroy(() => {
    			previously_focused.focus();
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			modal = $$value;
    			$$invalidate(0, modal);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		onDestroy,
    		dispatch,
    		close,
    		modal,
    		handle_keydown,
    		previously_focused
    	});

    	$$self.$inject_state = $$props => {
    		if ("modal" in $$props) $$invalidate(0, modal = $$props.modal);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [modal, close, handle_keydown, $$scope, slots, div1_binding];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/Footer.svelte generated by Svelte v3.35.0 */
    const file$6 = "src/components/Footer.svelte";

    function create_fragment$6(ctx) {
    	let footer;
    	let a0;
    	let t1;
    	let a1;
    	let t3;
    	let a2;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowresize*/ ctx[1]);

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			a0 = element("a");
    			a0.textContent = "© Library Publishing Interest Group";
    			t1 = text("  | \n");
    			a1 = element("a");
    			a1.textContent = "About";
    			t3 = text(" | \n");
    			a2 = element("a");
    			a2.textContent = "Useful Resources";
    			attr_dev(a0, "href", "https://www.ifla.org/library-publishing");
    			add_location(a0, file$6, 14, 0, 284);
    			attr_dev(a1, "href", "/test.html");
    			add_location(a1, file$6, 15, 0, 388);
    			attr_dev(a2, "href", "/Resources.html");
    			add_location(a2, file$6, 16, 0, 423);
    			attr_dev(footer, "class", "svelte-hu3890");
    			add_location(footer, file$6, 13, 0, 275);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, a0);
    			append_dev(footer, t1);
    			append_dev(footer, a1);
    			append_dev(footer, t3);
    			append_dev(footer, a2);

    			if (!mounted) {
    				dispose = listen_dev(window, "resize", /*onwindowresize*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Footer", slots, []);
    	let innerWidth;
    	let opened = true;
    	let showModal = false;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	function onwindowresize() {
    		$$invalidate(0, innerWidth = window.innerWidth);
    	}

    	$$self.$capture_state = () => ({
    		MaterialIcon,
    		AboutBox,
    		Modal,
    		innerWidth,
    		opened,
    		showModal
    	});

    	$$self.$inject_state = $$props => {
    		if ("innerWidth" in $$props) $$invalidate(0, innerWidth = $$props.innerWidth);
    		if ("opened" in $$props) opened = $$props.opened;
    		if ("showModal" in $$props) showModal = $$props.showModal;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [innerWidth, onwindowresize];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    const categoryGroups = [
      'Type of Libraries'
    ];

    // one more categories?

    const styles = [{
        //style for defaults
        group: 'Type of Libraries',
        categoryName: 'Academic Library',
        subcategoryName: null,
        fillColor: '#1aa139',
        strokeColor: '#000',
        icon: 'grocery.png'
      },
      {
        //styles for rows with subcategories
        group: 'Type of Libraries',
        categoryName: 'Academic Library',
        subcategoryName: 'supermarket',
        fillColor: '#1aa139',
        strokeColor: '#000',
        icon: 'supermarket.png'
      },
      {
        group: 'Type of Libraries',
        categoryName: 'Public Library',
        subcategoryName: null,
        fillColor: '#69b657',
        strokeColor: '#000',
        icon: 'bread.png'
      },
      {
        group: '',
        categoryName: '',
        subcategoryName: '',
        fillColor: '',
        strokeColor: '',
        icon: 'blank.png'
      }
    ];

    /* src/components/map/Legend.svelte generated by Svelte v3.35.0 */

    const { Object: Object_1 } = globals;
    const file$7 = "src/components/map/Legend.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (35:4) {#if opened}
    function create_if_block$1(ctx) {
    	let each_1_anchor;
    	let each_value = Object.values(/*groups*/ ctx[2]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*Object, groups*/ 4) {
    				each_value = Object.values(/*groups*/ ctx[2]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(35:4) {#if opened}",
    		ctx
    	});

    	return block;
    }

    // (36:8) {#each Object.values(groups) as group}
    function create_each_block(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let t1_value = /*group*/ ctx[3].names.join(", ") + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(div0, "class", "marker marker-category svelte-mv43tt");
    			set_style(div0, "background-color", /*group*/ ctx[3].color);
    			add_location(div0, file$7, 37, 16, 1131);
    			add_location(div1, file$7, 38, 16, 1230);
    			attr_dev(div2, "class", "legend-item svelte-mv43tt");
    			add_location(div2, file$7, 36, 12, 1089);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, t1);
    			append_dev(div2, t2);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(36:8) {#each Object.values(groups) as group}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div1;
    	let div0;
    	let h5;
    	let t1;
    	let p;
    	let a;
    	let t2_value = (/*opened*/ ctx[0] ? "Hide" : "Show") + "";
    	let t2;
    	let t3;
    	let mounted;
    	let dispose;
    	let if_block = /*opened*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Legend";
    			t1 = space();
    			p = element("p");
    			a = element("a");
    			t2 = text(t2_value);
    			t3 = space();
    			if (if_block) if_block.c();
    			attr_dev(h5, "class", "svelte-mv43tt");
    			add_location(h5, file$7, 31, 8, 871);
    			attr_dev(a, "href", "#legend");
    			attr_dev(a, "aria-label", "Hide map legend");
    			add_location(a, file$7, 32, 11, 898);
    			attr_dev(p, "class", "svelte-mv43tt");
    			add_location(p, file$7, 32, 8, 895);
    			attr_dev(div0, "class", "legend-title svelte-mv43tt");
    			add_location(div0, file$7, 30, 4, 836);
    			attr_dev(div1, "class", "legend svelte-mv43tt");
    			attr_dev(div1, "id", "legend");
    			add_location(div1, file$7, 29, 0, 799);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(p, a);
    			append_dev(a, t2);
    			append_dev(div1, t3);
    			if (if_block) if_block.m(div1, null);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*toggleOpen*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*opened*/ 1 && t2_value !== (t2_value = (/*opened*/ ctx[0] ? "Hide" : "Show") + "")) set_data_dev(t2, t2_value);

    			if (/*opened*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Legend", slots, []);

    	let opened = localStorage.getItem("header") === null
    	? true
    	: JSON.parse(localStorage.getItem("header"));

    	function toggleOpen() {
    		//toggle and save to local storage
    		$$invalidate(0, opened = !opened);

    		localStorage.setItem("header", opened);
    	}

    	//group similar colors
    	const groups = styles.filter(i => i.group).reduce(
    		(groups, i) => {
    			const color = i.fillColor, name = i.categoryName;

    			if (!(color in groups)) {
    				//setup object
    				groups[color] = { names: [], color };
    			}

    			if (!groups[color].names.includes(name)) {
    				//only push if unique
    				groups[color].names.push(name);
    			}

    			return groups;
    		},
    		{}
    	);

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Legend> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		categoryGroups,
    		styles,
    		opened,
    		toggleOpen,
    		groups
    	});

    	$$self.$inject_state = $$props => {
    		if ("opened" in $$props) $$invalidate(0, opened = $$props.opened);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [opened, toggleOpen, groups];
    }

    class Legend extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Legend",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function createSelectedItem() {
        const { subscribe, set, update } = writable(null);

        return {
            subscribe,
            select: (row, map, center) => {
                //go to latlng
                if(map && center){
                    const zoom = 17;
                    map.flyTo({center, zoom});
                }
                set(row);
            },
            reset: () => set(null)
        };
    }


    const rows = writable([]);
    const filters = writable([]);
    const selectedItem = createSelectedItem();

    const mapObject = writable(null);
    const filterExtent = writable(false);

    /* src/components/MapView.svelte generated by Svelte v3.35.0 */
    const file$8 = "src/components/MapView.svelte";

    function create_fragment$8(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "id", "map");
    			attr_dev(div, "class", "svelte-1ati7y4");
    			add_location(div, file$8, 297, 0, 9806);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			/*div_binding*/ ctx[8](div);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[8](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let items;
    	let $rows;
    	let $filters;
    	let $filterExtent;
    	let $selectedItem;
    	validate_store(rows, "rows");
    	component_subscribe($$self, rows, $$value => $$invalidate(4, $rows = $$value));
    	validate_store(filters, "filters");
    	component_subscribe($$self, filters, $$value => $$invalidate(5, $filters = $$value));
    	validate_store(filterExtent, "filterExtent");
    	component_subscribe($$self, filterExtent, $$value => $$invalidate(6, $filterExtent = $$value));
    	validate_store(selectedItem, "selectedItem");
    	component_subscribe($$self, selectedItem, $$value => $$invalidate(7, $selectedItem = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("MapView", slots, []);
    	let map;
    	let container;
    	let loaded = false;
    	let popup;
    	let previousSelectedItem;
    	let lastFeature;

    	function updateExtentFilter(filterExtent) {
    		const features = map.queryRenderedFeatures({ layers: ["markers", "points"] });

    		if (features) {
    			const unqiueIds = [...new Set(features.map(feature => feature.properties.id))];

    			if ($filters) {
    				//remove existing filter
    				const _filters = $filters;

    				const filter = _filters.findIndex(f => f.label === "map-extent");
    				if (filter > -1) _filters.splice(filter, 1);

    				if (filterExtent) {
    					//generate new filter
    					const mapExtentFilter = {
    						label: "map-extent",
    						filter: row => unqiueIds.includes(row.id)
    					};

    					filters.set([..._filters, mapExtentFilter]);
    				} else {
    					filters.set(_filters);
    				}
    			}
    		}
    	}

    	function generateFeatures(items) {
    		return {
    			type: "FeatureCollection",
    			features: items.map(item => {
    				return {
    					type: "Feature",
    					id: item.id,
    					geometry: {
    						type: "Point",
    						coordinates: item.coordinates
    					},
    					properties: item
    				};
    			})
    		};
    	}

    	onMount(() => {
    		mapboxgl.accessToken = "pk.eyJ1IjoiamFzb24yNzMiLCJhIjoiY2szZXBubGM1MDBxcDNtbzZxNHBxc2I5OSJ9.uT0EGQIuUTU5cBIlu_OOcQ";

    		$$invalidate(1, map = new mapboxgl.Map({
    				container,
    				style: "mapbox://styles/mapbox/streets-v11",
    				//center: [-89.2601765, 48.4205727],
    				zoom: 1,
    				maxZoom: 14
    			}));

    		map.addControl(new mapboxgl.NavigationControl());

    		// //To pan and zoom, use 2 fingers
    		// map.addControl(new MultiTouch());
    		popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

    		map.on("load", () => {
    			const data = generateFeatures(items);

    			// Add an image to use as a custom marker
    			map.loadImage("https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png", function (error, image) {
    				if (error) throw error;
    				map.addImage("custom-marker", image);
    			});

    			map.addSource("libraries", {
    				type: "geojson",
    				data,
    				cluster: true,
    				clusterMaxZoom: 14, // maz zoom to cluster points on
    				clusterRadius: 50, // radius of each cluster
    				
    			});

    			map.addLayer({
    				id: "libraries-circle",
    				type: "circle",
    				source: "libraries",
    				filter: ["has", "point_count"],
    				paint: {
    					// Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
    					// with three steps to implement three types of circles:
    					//   * Blue, 20px circles when point count is less than 100
    					//   * Yellow, 30px circles when point count is between 100 and 750
    					//   * Pink, 40px circles when point count is greater than or equal to 750
    					"circle-color": ["step", ["get", "point_count"], "#51bbd6", 5, "#f1f075", 10, "#f28cb1"],
    					"circle-radius": ["step", ["get", "point_count"], 25, 5, 40, 10, 50]
    				}
    			});

    			// cluster count
    			map.addLayer({
    				id: "libraries-count",
    				type: "symbol",
    				source: "libraries",
    				filter: ["has", "point_count"],
    				layout: {
    					"text-field": "{point_count_abbreviated}",
    					"text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
    					"text-size": 16
    				}
    			});

    			map.addLayer({
    				id: "unclustered-library",
    				//type: "circle",
    				type: "symbol",
    				source: "libraries",
    				filter: ["!", ["has", "point_count"]],
    				layout: {
    					"icon-image": "custom-marker",
    					"icon-size": 0.68
    				}
    			}); //paint: {
    			//  "circle-color": "#00427a",
    			// "circle-radius": 8,

    			//  "circle-stroke-width": 1,
    			//  "circle-stroke-color": "#000"
    			// }
    			// inspect a cluster on click
    			map.on("click", "libraries-circle", function (e) {
    				var features = map.queryRenderedFeatures(e.point, { layers: ["libraries-circle"] });
    				var clusterId = features[0].properties.cluster_id;

    				map.getSource("libraries").getClusterExpansionZoom(clusterId, function (err, zoom) {
    					if (err) return;

    					map.easeTo({
    						center: features[0].geometry.coordinates,
    						zoom
    					});
    				});
    			});

    			map.on("mouseenter", "unclustered-library", e => {
    				map.getCanvas().style.cursor = "pointer";
    				const feature = e.features[0];
    				const coordinates = feature.geometry.coordinates.slice();
    				const InstitutionName = feature.properties["Institution Name"];
    				const LibraryName = feature.properties["Library Name"];
    				const description = `<h6>${InstitutionName}</h6><br  /><p>${LibraryName}</p>`;
    				popup.setLngLat(coordinates).setHTML(description).addTo(map);
    			});

    			map.on("mousemove", "unclustered-library", e => {
    				const feature = map.queryRenderedFeatures(e.point)[0];

    				if (feature.properties.id !== lastFeature) {
    					lastFeature = feature.properties.id;
    					const coordinates = feature.geometry.coordinates.slice();
    					const InstitutionName = feature.properties["Institution Name"];
    					const LibraryName = feature.properties["Library Name"];
    					const description = `<h6>${InstitutionName}</h6><br  /><p>${LibraryName}</p>`;
    					popup.remove();
    					popup.setLngLat(coordinates).setHTML(description).addTo(map);
    				}
    			});

    			map.on("mouseleave", "unclustered-library", () => {
    				map.getCanvas().style.cursor = "";
    				popup.remove();
    			});

    			map.on("click", () => {
    				selectedItem.select(null);
    			});

    			map.on("click", "unclustered-library", e => {
    				const feature = e.features[0];
    				selectedItem.select(feature.properties);
    			});

    			//load icon and symbol layer
    			const uniqueStyleIcons = [...new Set(styles.map(style => style.icon))];
    		});

    		mapObject.set(map);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MapView> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			container = $$value;
    			$$invalidate(0, container);
    		});
    	}

    	$$self.$capture_state = () => ({
    		Legend,
    		mapObject,
    		selectedItem,
    		filters,
    		rows,
    		filterExtent,
    		styles,
    		onMount,
    		map,
    		container,
    		loaded,
    		popup,
    		previousSelectedItem,
    		lastFeature,
    		updateExtentFilter,
    		generateFeatures,
    		items,
    		$rows,
    		$filters,
    		$filterExtent,
    		$selectedItem
    	});

    	$$self.$inject_state = $$props => {
    		if ("map" in $$props) $$invalidate(1, map = $$props.map);
    		if ("container" in $$props) $$invalidate(0, container = $$props.container);
    		if ("loaded" in $$props) $$invalidate(11, loaded = $$props.loaded);
    		if ("popup" in $$props) popup = $$props.popup;
    		if ("previousSelectedItem" in $$props) $$invalidate(2, previousSelectedItem = $$props.previousSelectedItem);
    		if ("lastFeature" in $$props) lastFeature = $$props.lastFeature;
    		if ("items" in $$props) $$invalidate(3, items = $$props.items);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$rows, $filters*/ 48) {
    			//filter using everything but map-extent
    			 $$invalidate(3, items = $rows.filter(row => $filters.filter(f => f.label !== "map-extent").every(f => f.filter(row))));
    		}

    		if ($$self.$$.dirty & /*map, $filterExtent*/ 66) {
    			 if (map && loaded) updateExtentFilter($filterExtent); //update filter when $filterExtent checkbox store changes
    		}

    		if ($$self.$$.dirty & /*map, items*/ 10) {
    			 if (map && loaded) {
    				const data = generateFeatures(items);
    				const layer = map.getSource("libraries");

    				if (layer) {
    					layer.setData(data);
    				}
    			}
    		}

    		if ($$self.$$.dirty & /*map, previousSelectedItem, $selectedItem*/ 134) {
    			 if (map && loaded) {
    				if (previousSelectedItem) {
    					//remove previous selectedItem
    					map.setFeatureState(
    						{
    							source: "libraries",
    							id: previousSelectedItem.id
    						},
    						{ highlight: false }
    					);
    				}

    				if ($selectedItem) {
    					map.setFeatureState(
    						{
    							source: "libraries",
    							id: $selectedItem.id
    						},
    						{ highlight: true }
    					);
    				}

    				$$invalidate(2, previousSelectedItem = $selectedItem);
    			}
    		}
    	};

    	return [
    		container,
    		map,
    		previousSelectedItem,
    		items,
    		$rows,
    		$filters,
    		$filterExtent,
    		$selectedItem,
    		div_binding
    	];
    }

    class MapView extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MapView",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var flexsearch_min = createCommonjsModule(function (module, exports) {
    (function(K,R,w){let L;(L=w.define)&&L.amd?L([],function(){return R}):(L=w.modules)?L[K.toLowerCase()]=R:module.exports=R;})("FlexSearch",function ma(K){function w(a,c){const b=c?c.id:a&&a.id;this.id=b||0===b?b:na++;this.init(a,c);fa(this,"index",function(){return this.a?Object.keys(this.a.index[this.a.keys[0]].c):Object.keys(this.c)});fa(this,"length",function(){return this.index.length});}function L(a,c,b,d){this.u!==this.g&&(this.o=this.o.concat(b),this.u++,
    d&&this.o.length>=d&&(this.u=this.g),this.u===this.g&&(this.cache&&this.j.set(c,this.o),this.F&&this.F(this.o)));return this}function S(a){const c=B();for(const b in a)if(a.hasOwnProperty(b)){const d=a[b];F(d)?c[b]=d.slice(0):G(d)?c[b]=S(d):c[b]=d;}return c}function W(a,c){const b=a.length,d=O(c),e=[];for(let f=0,h=0;f<b;f++){const g=a[f];if(d&&c(g)||!d&&!c[g])e[h++]=g;}return e}function P(a,c,b,d,e,f,h,g,k,l){b=ha(b,h?0:e,g,f,c,k,l);let p;g&&(g=b.page,p=b.next,b=b.result);if(h)c=this.where(h,null,
    e,b);else {c=b;b=this.l;e=c.length;f=Array(e);for(h=0;h<e;h++)f[h]=b[c[h]];c=f;}b=c;d&&(O(d)||(M=d.split(":"),1<M.length?d=oa:(M=M[0],d=pa)),b.sort(d));b=T(g,p,b);this.cache&&this.j.set(a,b);return b}function fa(a,c,b){Object.defineProperty(a,c,{get:b});}function r(a){return new RegExp(a,"g")}function Q(a,c){for(let b=0;b<c.length;b+=2)a=a.replace(c[b],c[b+1]);return a}function V(a,c,b,d,e,f,h,g){if(c[b])return c[b];e=e?(g-(h||g/1.5))*f+(h||g/1.5)*e:f;c[b]=e;e>=h&&(a=a[g-(e+.5>>0)],a=a[b]||(a[b]=[]),
    a[a.length]=d);return e}function ba(a,c){if(a){const b=Object.keys(a);for(let d=0,e=b.length;d<e;d++){const f=b[d],h=a[f];if(h)for(let g=0,k=h.length;g<k;g++)if(h[g]===c){1===k?delete a[f]:h.splice(g,1);break}else G(h[g])&&ba(h[g],c);}}}function ca(a){let c="",b="";var d="";for(let e=0;e<a.length;e++){const f=a[e];if(f!==b)if(e&&"h"===f){if(d="a"===d||"e"===d||"i"===d||"o"===d||"u"===d||"y"===d,("a"===b||"e"===b||"i"===b||"o"===b||"u"===b||"y"===b)&&d||" "===b)c+=f;}else c+=f;d=e===a.length-1?"":a[e+
    1];b=f;}return c}function qa(a,c){a=a.length-c.length;return 0>a?1:a?-1:0}function pa(a,c){a=a[M];c=c[M];return a<c?-1:a>c?1:0}function oa(a,c){const b=M.length;for(let d=0;d<b;d++)a=a[M[d]],c=c[M[d]];return a<c?-1:a>c?1:0}function T(a,c,b){return a?{page:a,next:c?""+c:null,result:b}:b}function ha(a,c,b,d,e,f,h){let g,k=[];if(!0===b){b="0";var l="";}else l=b&&b.split(":");const p=a.length;if(1<p){const y=B(),t=[];let v,x;var n=0,m;let I;var u=!0;let D,E=0,N,da,X,ea;l&&(2===l.length?(X=l,l=!1):l=ea=
    parseInt(l[0],10));if(h){for(v=B();n<p;n++)if("not"===e[n])for(x=a[n],I=x.length,m=0;m<I;m++)v["@"+x[m]]=1;else da=n+1;if(C(da))return T(b,g,k);n=0;}else N=J(e)&&e;let Y;for(;n<p;n++){const ra=n===(da||p)-1;if(!N||!n)if((m=N||e&&e[n])&&"and"!==m)if("or"===m)Y=!1;else continue;else Y=f=!0;x=a[n];if(I=x.length){if(u)if(D){var q=D.length;for(m=0;m<q;m++){u=D[m];var A="@"+u;h&&v[A]||(y[A]=1,f||(k[E++]=u));}D=null;u=!1;}else {D=x;continue}A=!1;for(m=0;m<I;m++){q=x[m];var z="@"+q;const Z=f?y[z]||0:n;if(!(!Z&&
    !d||h&&v[z]||!f&&y[z]))if(Z===n){if(ra){if(!ea||--ea<E)if(k[E++]=q,c&&E===c)return T(b,E+(l||0),k)}else y[z]=n+1;A=!0;}else d&&(z=t[Z]||(t[Z]=[]),z[z.length]=q);}if(Y&&!A&&!d)break}else if(Y&&!d)return T(b,g,x)}if(D)if(n=D.length,h)for(m=l?parseInt(l,10):0;m<n;m++)a=D[m],v["@"+a]||(k[E++]=a);else k=D;if(d)for(E=k.length,X?(n=parseInt(X[0],10)+1,m=parseInt(X[1],10)+1):(n=t.length,m=0);n--;)if(q=t[n]){for(I=q.length;m<I;m++)if(d=q[m],!h||!v["@"+d])if(k[E++]=d,c&&E===c)return T(b,n+":"+m,k);m=0;}}else !p||
    e&&"not"===e[0]||(k=a[0],l&&(l=parseInt(l[0],10)));c&&(h=k.length,l&&l>h&&(l=0),l=l||0,g=l+c,g<h?k=k.slice(l,g):(g=0,l&&(k=k.slice(l))));return T(b,g,k)}function J(a){return "string"===typeof a}function F(a){return a.constructor===Array}function O(a){return "function"===typeof a}function G(a){return "object"===typeof a}function C(a){return "undefined"===typeof a}function ia(a){const c=Array(a);for(let b=0;b<a;b++)c[b]=B();return c}function B(){return Object.create(null)}function sa(){let a,c;self.onmessage=
    function(b){if(b=b.data)if(b.search){const d=c.search(b.content,b.threshold?{limit:b.limit,threshold:b.threshold,where:b.where}:b.limit);self.postMessage({id:a,content:b.content,limit:b.limit,result:d});}else b.add?c.add(b.id,b.content):b.update?c.update(b.id,b.content):b.remove?c.remove(b.id):b.clear?c.clear():b.info?(b=c.info(),b.worker=a,console.log(b)):b.register&&(a=b.id,b.options.cache=!1,b.options.async=!1,b.options.worker=!1,c=(new Function(b.register.substring(b.register.indexOf("{")+1,b.register.lastIndexOf("}"))))(),
    c=new c(b.options));};}function ta(a,c,b,d){a=K("flexsearch","id"+a,sa,function(f){(f=f.data)&&f.result&&d(f.id,f.content,f.result,f.limit,f.where,f.cursor,f.suggest);},c);const e=ma.toString();b.id=c;a.postMessage({register:e,options:b,id:c});return a}const H={encode:"icase",f:"forward",split:/\W+/,cache:!1,async:!1,g:!1,D:!1,a:!1,b:9,threshold:0,depth:0},ja={memory:{encode:"extra",f:"strict",threshold:0,b:1},speed:{encode:"icase",f:"strict",threshold:1,b:3,depth:2},match:{encode:"extra",f:"full",threshold:1,
    b:3},score:{encode:"extra",f:"strict",threshold:1,b:9,depth:4},balance:{encode:"balance",f:"strict",threshold:0,b:3,depth:3},fast:{encode:"icase",f:"strict",threshold:8,b:9,depth:1}},aa=[];let na=0;const ka={},la={};w.create=function(a,c){return new w(a,c)};w.registerMatcher=function(a){for(const c in a)a.hasOwnProperty(c)&&aa.push(r(c),a[c]);return this};w.registerEncoder=function(a,c){U[a]=c.bind(U);return this};w.registerLanguage=function(a,c){ka[a]=c.filter;la[a]=c.stemmer;return this};w.encode=
    function(a,c){return U[a](c)};w.prototype.init=function(a,c){this.v=[];if(c){var b=c.preset;a=c;}else a||(a=H),b=a.preset;c={};J(a)?(c=ja[a],a={}):b&&(c=ja[b]);if(b=a.worker)if("undefined"===typeof Worker)a.worker=!1,this.m=null;else {var d=parseInt(b,10)||4;this.C=-1;this.u=0;this.o=[];this.F=null;this.m=Array(d);for(var e=0;e<d;e++)this.m[e]=ta(this.id,e,a,L.bind(this));}this.f=a.tokenize||c.f||this.f||H.f;this.split=C(b=a.split)?this.split||H.split:J(b)?r(b):b;this.D=a.rtl||this.D||H.D;this.async=
    "undefined"===typeof Promise||C(b=a.async)?this.async||H.async:b;this.g=C(b=a.worker)?this.g||H.g:b;this.threshold=C(b=a.threshold)?c.threshold||this.threshold||H.threshold:b;this.b=C(b=a.resolution)?b=c.b||this.b||H.b:b;b<=this.threshold&&(this.b=this.threshold+1);this.depth="strict"!==this.f||C(b=a.depth)?c.depth||this.depth||H.depth:b;this.w=(b=C(b=a.encode)?c.encode||H.encode:b)&&U[b]&&U[b].bind(U)||(O(b)?b:this.w||!1);(b=a.matcher)&&this.addMatcher(b);if(b=(c=a.lang)||a.filter){J(b)&&(b=ka[b]);
    if(F(b)){d=this.w;e=B();for(var f=0;f<b.length;f++){var h=d?d(b[f]):b[f];e[h]=1;}b=e;}this.filter=b;}if(b=c||a.stemmer){var g;c=J(b)?la[b]:b;d=this.w;e=[];for(g in c)c.hasOwnProperty(g)&&(f=d?d(g):g,e.push(r(f+"($|\\W)"),d?d(c[g]):c[g]));this.stemmer=g=e;}this.a=e=(b=a.doc)?S(b):this.a||H.a;this.i=ia(this.b-(this.threshold||0));this.h=B();this.c=B();if(e){this.l=B();a.doc=null;g=e.index={};c=e.keys=[];d=e.field;f=e.tag;h=e.store;F(e.id)||(e.id=e.id.split(":"));if(h){var k=B();if(J(h))k[h]=1;else if(F(h))for(let l=
    0;l<h.length;l++)k[h[l]]=1;else G(h)&&(k=h);e.store=k;}if(f){this.G=B();h=B();if(d)if(J(d))h[d]=a;else if(F(d))for(k=0;k<d.length;k++)h[d[k]]=a;else G(d)&&(h=d);F(f)||(e.tag=f=[f]);for(d=0;d<f.length;d++)this.G[f[d]]=B();this.I=f;d=h;}if(d){let l;F(d)||(G(d)?(l=d,e.field=d=Object.keys(d)):e.field=d=[d]);for(e=0;e<d.length;e++)f=d[e],F(f)||(l&&(a=l[f]),c[e]=f,d[e]=f.split(":")),g[f]=new w(a);}a.doc=b;}this.B=!0;this.j=(this.cache=b=C(b=a.cache)?this.cache||H.cache:b)?new ua(b):!1;return this};w.prototype.encode=
    function(a){a&&(aa.length&&(a=Q(a,aa)),this.v.length&&(a=Q(a,this.v)),this.w&&(a=this.w(a)),this.stemmer&&(a=Q(a,this.stemmer)));return a};w.prototype.addMatcher=function(a){const c=this.v;for(const b in a)a.hasOwnProperty(b)&&c.push(r(b),a[b]);return this};w.prototype.add=function(a,c,b,d,e){if(this.a&&G(a))return this.A("add",a,c);if(c&&J(c)&&(a||0===a)){var f="@"+a;if(this.c[f]&&!d)return this.update(a,c);if(this.g)return ++this.C>=this.m.length&&(this.C=0),this.m[this.C].postMessage({add:!0,id:a,
    content:c}),this.c[f]=""+this.C,b&&b(),this;if(!e){if(this.async&&"function"!==typeof importScripts){let t=this;f=new Promise(function(v){setTimeout(function(){t.add(a,c,null,d,!0);t=null;v();});});if(b)f.then(b);else return f;return this}if(b)return this.add(a,c,null,d,!0),b(),this}c=this.encode(c);if(!c.length)return this;b=this.f;e=O(b)?b(c):c.split(this.split);this.filter&&(e=W(e,this.filter));const n=B();n._ctx=B();const m=e.length,u=this.threshold,q=this.depth,A=this.b,z=this.i,y=this.D;for(let t=
    0;t<m;t++){var h=e[t];if(h){var g=h.length,k=(y?t+1:m-t)/m,l="";switch(b){case "reverse":case "both":for(var p=g;--p;)l=h[p]+l,V(z,n,l,a,y?1:(g-p)/g,k,u,A-1);l="";case "forward":for(p=0;p<g;p++)l+=h[p],V(z,n,l,a,y?(p+1)/g:1,k,u,A-1);break;case "full":for(p=0;p<g;p++){const v=(y?p+1:g-p)/g;for(let x=g;x>p;x--)l=h.substring(p,x),V(z,n,l,a,v,k,u,A-1);}break;default:if(g=V(z,n,h,a,1,k,u,A-1),q&&1<m&&g>=u)for(g=n._ctx[h]||(n._ctx[h]=B()),h=this.h[h]||(this.h[h]=ia(A-(u||0))),k=t-q,l=t+q+1,0>k&&(k=0),l>
    m&&(l=m);k<l;k++)k!==t&&V(h,g,e[k],a,0,A-(k<t?t-k:k-t),u,A-1);}}}this.c[f]=1;this.B=!1;}return this};w.prototype.A=function(a,c,b){if(F(c)){var d=c.length;if(d--){for(var e=0;e<d;e++)this.A(a,c[e]);return this.A(a,c[d],b)}}else {var f=this.a.index,h=this.a.keys,g=this.a.tag;e=this.a.store;var k;var l=this.a.id;d=c;for(var p=0;p<l.length;p++)d=d[l[p]];if("remove"===a&&(delete this.l[d],l=h.length,l--)){for(c=0;c<l;c++)f[h[c]].remove(d);return f[h[l]].remove(d,b)}if(g){for(k=0;k<g.length;k++){var n=g[k];
    var m=c;l=n.split(":");for(p=0;p<l.length;p++)m=m[l[p]];m="@"+m;}k=this.G[n];k=k[m]||(k[m]=[]);}l=this.a.field;for(let u=0,q=l.length;u<q;u++){n=l[u];g=c;for(m=0;m<n.length;m++)g=g[n[m]];n=f[h[u]];m="add"===a?n.add:n.update;u===q-1?m.call(n,d,g,b):m.call(n,d,g);}if(e){b=Object.keys(e);a=B();for(f=0;f<b.length;f++)if(h=b[f],e[h]){h=h.split(":");let u,q;for(l=0;l<h.length;l++)g=h[l],u=(u||c)[g],q=(q||a)[g]=u;}c=a;}k&&(k[k.length]=c);this.l[d]=c;}return this};w.prototype.update=function(a,c,b){if(this.a&&
    G(a))return this.A("update",a,c);this.c["@"+a]&&J(c)&&(this.remove(a),this.add(a,c,b,!0));return this};w.prototype.remove=function(a,c,b){if(this.a&&G(a))return this.A("remove",a,c);var d="@"+a;if(this.c[d]){if(this.g)return this.m[this.c[d]].postMessage({remove:!0,id:a}),delete this.c[d],c&&c(),this;if(!b){if(this.async&&"function"!==typeof importScripts){let e=this;d=new Promise(function(f){setTimeout(function(){e.remove(a,null,!0);e=null;f();});});if(c)d.then(c);else return d;return this}if(c)return this.remove(a,
    null,!0),c(),this}for(c=0;c<this.b-(this.threshold||0);c++)ba(this.i[c],a);this.depth&&ba(this.h,a);delete this.c[d];this.B=!1;}return this};let M;w.prototype.search=function(a,c,b,d){if(G(c)){if(F(c))for(var e=0;e<c.length;e++)c[e].query=a;else c.query=a;a=c;c=1E3;}else c&&O(c)?(b=c,c=1E3):c||0===c||(c=1E3);if(this.g){this.F=b;this.u=0;this.o=[];for(var f=0;f<this.g;f++)this.m[f].postMessage({search:!0,limit:c,content:a});}else {var h=[],g=a;if(G(a)&&!F(a)){b||(b=a.callback)&&(g.callback=null);var k=
    a.sort;var l=a.page;c=a.limit;f=a.threshold;var p=a.suggest;a=a.query;}if(this.a){f=this.a.index;const y=g.where;var n=g.bool||"or",m=g.field;let t=n;let v,x;if(m)F(m)||(m=[m]);else if(F(g)){var u=g;m=[];t=[];for(var q=0;q<g.length;q++)d=g[q],e=d.bool||n,m[q]=d.field,t[q]=e,"not"===e?v=!0:"and"===e&&(x=!0);}else m=this.a.keys;n=m.length;for(q=0;q<n;q++)u&&(g=u[q]),l&&!J(g)&&(g.page=null,g.limit=0),h[q]=f[m[q]].search(g,0);if(b)return b(P.call(this,a,t,h,k,c,p,y,l,x,v));if(this.async){const I=this;return new Promise(function(D){Promise.all(h).then(function(E){D(P.call(I,
    a,t,E,k,c,p,y,l,x,v));});})}return P.call(this,a,t,h,k,c,p,y,l,x,v)}f||(f=this.threshold||0);if(!d){if(this.async&&"function"!==typeof importScripts){let y=this;f=new Promise(function(t){setTimeout(function(){t(y.search(g,c,null,!0));y=null;});});if(b)f.then(b);else return f;return this}if(b)return b(this.search(g,c,null,!0)),this}if(!a||!J(a))return h;g=a;if(this.cache)if(this.B){if(b=this.j.get(a))return b}else this.j.clear(),this.B=!0;g=this.encode(g);if(!g.length)return h;b=this.f;b=O(b)?b(g):g.split(this.split);
    this.filter&&(b=W(b,this.filter));u=b.length;d=!0;e=[];var A=B(),z=0;1<u&&(this.depth&&"strict"===this.f?n=!0:b.sort(qa));if(!n||(q=this.h)){const y=this.b;for(;z<u;z++){let t=b[z];if(t){if(n){if(!m)if(q[t])m=t,A[t]=1;else if(!p)return h;if(p&&z===u-1&&!e.length)n=!1,t=m||t,A[t]=0;else if(!m)continue}if(!A[t]){const v=[];let x=!1,I=0;const D=n?q[m]:this.i;if(D){let E;for(let N=0;N<y-f;N++)if(E=D[N]&&D[N][t])v[I++]=E,x=!0;}if(x)m=t,e[e.length]=1<I?v.concat.apply([],v):v[0];else if(!p){d=!1;break}A[t]=
    1;}}}}else d=!1;d&&(h=ha(e,c,l,p));this.cache&&this.j.set(a,h);return h}};w.prototype.find=function(a,c){return this.where(a,c,1)[0]||null};w.prototype.where=function(a,c,b,d){const e=this.l,f=[];let h=0;let g;var k;let l;if(G(a)){b||(b=c);var p=Object.keys(a);var n=p.length;g=!1;if(1===n&&"id"===p[0])return [e[a.id]];if((k=this.I)&&!d)for(var m=0;m<k.length;m++){var u=k[m],q=a[u];if(!C(q)){l=this.G[u]["@"+q];if(0===--n)return l;p.splice(p.indexOf(u),1);delete a[u];break}}k=Array(n);for(m=0;m<n;m++)k[m]=
    p[m].split(":");}else {if(O(a)){c=d||Object.keys(e);b=c.length;for(p=0;p<b;p++)n=e[c[p]],a(n)&&(f[h++]=n);return f}if(C(c))return [e[a]];if("id"===a)return [e[c]];p=[a];n=1;k=[a.split(":")];g=!0;}d=l||d||Object.keys(e);m=d.length;for(u=0;u<m;u++){q=l?d[u]:e[d[u]];let A=!0;for(let z=0;z<n;z++){g||(c=a[p[z]]);const y=k[z],t=y.length;let v=q;if(1<t)for(let x=0;x<t;x++)v=v[y[x]];else v=v[y[0]];if(v!==c){A=!1;break}}if(A&&(f[h++]=q,b&&h===b))break}return f};w.prototype.info=function(){if(this.g)for(let a=0;a<
    this.g;a++)this.m[a].postMessage({info:!0,id:this.id});else return {id:this.id,items:this.length,cache:this.cache&&this.cache.s?this.cache.s.length:!1,matcher:aa.length+(this.v?this.v.length:0),worker:this.g,threshold:this.threshold,depth:this.depth,resolution:this.b,contextual:this.depth&&"strict"===this.f}};w.prototype.clear=function(){return this.destroy().init()};w.prototype.destroy=function(){this.cache&&(this.j.clear(),this.j=null);this.i=this.h=this.c=null;if(this.a){const a=this.a.keys;for(let c=
    0;c<a.length;c++)this.a.index[a[c]].destroy();this.a=this.l=null;}return this};w.prototype.export=function(a){const c=!a||C(a.serialize)||a.serialize;if(this.a){const d=!a||C(a.doc)||a.doc;var b=!a||C(a.index)||a.index;a=[];let e=0;if(b)for(b=this.a.keys;e<b.length;e++){const f=this.a.index[b[e]];a[e]=[f.i,f.h,Object.keys(f.c)];}d&&(a[e]=this.l);}else a=[this.i,this.h,Object.keys(this.c)];c&&(a=JSON.stringify(a));return a};w.prototype.import=function(a,c){if(!c||C(c.serialize)||c.serialize)a=JSON.parse(a);
    const b=B();if(this.a){var d=!c||C(c.doc)||c.doc,e=0;if(!c||C(c.index)||c.index){c=this.a.keys;const h=c.length;for(var f=a[0][2];e<f.length;e++)b[f[e]]=1;for(e=0;e<h;e++){f=this.a.index[c[e]];const g=a[e];g&&(f.i=g[0],f.h=g[1],f.c=b);}}d&&(this.l=G(d)?d:a[e]);}else {d=a[2];for(e=0;e<d.length;e++)b[d[e]]=1;this.i=a[0];this.h=a[1];this.c=b;}};const va=function(){const a=r("\\s+"),c=r("[^a-z0-9 ]"),b=[r("[-/]")," ",c,"",a," "];return function(d){return ca(Q(d.toLowerCase(),b))}}(),U={icase:function(a){return a.toLowerCase()},
    simple:function(){const a=r("\\s+"),c=r("[^a-z0-9 ]"),b=r("[-/]"),d=r("[\u00e0\u00e1\u00e2\u00e3\u00e4\u00e5]"),e=r("[\u00e8\u00e9\u00ea\u00eb]"),f=r("[\u00ec\u00ed\u00ee\u00ef]"),h=r("[\u00f2\u00f3\u00f4\u00f5\u00f6\u0151]"),g=r("[\u00f9\u00fa\u00fb\u00fc\u0171]"),k=r("[\u00fd\u0177\u00ff]"),l=r("\u00f1"),p=r("[\u00e7c]"),n=r("\u00df"),m=r(" & "),u=[d,"a",e,"e",f,"i",h,"o",g,"u",k,"y",l,"n",p,"k",n,"s",m," and ",b," ",c,"",a," "];return function(q){q=Q(q.toLowerCase(),u);return " "===q?"":q}}(),advanced:function(){const a=
    r("ae"),c=r("ai"),b=r("ay"),d=r("ey"),e=r("oe"),f=r("ue"),h=r("ie"),g=r("sz"),k=r("zs"),l=r("ck"),p=r("cc"),n=r("sh"),m=r("th"),u=r("dt"),q=r("ph"),A=r("pf"),z=r("ou"),y=r("uo"),t=[a,"a",c,"ei",b,"ei",d,"ei",e,"o",f,"u",h,"i",g,"s",k,"s",n,"s",l,"k",p,"k",m,"t",u,"t",q,"f",A,"f",z,"o",y,"u"];return function(v,x){if(!v)return v;v=this.simple(v);2<v.length&&(v=Q(v,t));x||1<v.length&&(v=ca(v));return v}}(),extra:function(){const a=r("p"),c=r("z"),b=r("[cgq]"),d=r("n"),e=r("d"),f=r("[vw]"),h=r("[aeiouy]"),
    g=[a,"b",c,"s",b,"k",d,"m",e,"t",f,"f",h,""];return function(k){if(!k)return k;k=this.advanced(k,!0);if(1<k.length){k=k.split(" ");for(let l=0;l<k.length;l++){const p=k[l];1<p.length&&(k[l]=p[0]+Q(p.substring(1),g));}k=k.join(" ");k=ca(k);}return k}}(),balance:va},ua=function(){function a(c){this.clear();this.H=!0!==c&&c;}a.prototype.clear=function(){this.cache=B();this.count=B();this.index=B();this.s=[];};a.prototype.set=function(c,b){if(this.H&&C(this.cache[c])){let d=this.s.length;if(d===this.H){d--;
    const e=this.s[d];delete this.cache[e];delete this.count[e];delete this.index[e];}this.index[c]=d;this.s[d]=c;this.count[c]=-1;this.cache[c]=b;this.get(c);}else this.cache[c]=b;};a.prototype.get=function(c){const b=this.cache[c];if(this.H&&b){var d=++this.count[c];const f=this.index;let h=f[c];if(0<h){const g=this.s;for(var e=h;this.count[g[--h]]<=d&&-1!==h;);h++;if(h!==e){for(d=e;d>h;d--)e=g[d-1],g[d]=e,f[e]=d;g[h]=c;f[c]=h;}}}return b};return a}();return w}(function(){const K={},R="undefined"!==typeof Blob&&
    "undefined"!==typeof URL&&URL.createObjectURL;return function(w,L,S,W,P){S=R?URL.createObjectURL(new Blob(["("+S.toString()+")()"],{type:"text/javascript"})):w+".min.js";w+="-"+L;K[w]||(K[w]=[]);K[w][P]=new Worker(S);K[w][P].onmessage=W;return K[w][P]}}()),commonjsGlobal);
    });

    /* src/components/sidebar/filters/NameSearch.svelte generated by Svelte v3.35.0 */
    const file$9 = "src/components/sidebar/filters/NameSearch.svelte";

    function create_fragment$9(ctx) {
    	let div2;
    	let label;
    	let t1;
    	let div1;
    	let div0;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			label = element("label");
    			label.textContent = "Search by name";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			input = element("input");
    			attr_dev(label, "class", "label svelte-ze0kkb");
    			add_location(label, file$9, 75, 4, 1917);
    			attr_dev(input, "id", "text-input");
    			attr_dev(input, "placeholder", "Search here");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "name", "text-input");
    			attr_dev(input, "autocomplete", "off");
    			attr_dev(input, "class", "svelte-ze0kkb");
    			add_location(input, file$9, 78, 12, 2039);
    			attr_dev(div0, "class", "control is-expanded svelte-ze0kkb");
    			add_location(div0, file$9, 77, 8, 1993);
    			attr_dev(div1, "class", "field svelte-ze0kkb");
    			add_location(div1, file$9, 76, 4, 1965);
    			attr_dev(div2, "class", "field svelte-ze0kkb");
    			add_location(div2, file$9, 74, 0, 1893);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, label);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			set_input_value(input, /*value*/ ctx[0]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[5]),
    					listen_dev(input, "keyup", /*_search*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $rows;
    	let $filters;
    	validate_store(rows, "rows");
    	component_subscribe($$self, rows, $$value => $$invalidate(4, $rows = $$value));
    	validate_store(filters, "filters");
    	component_subscribe($$self, filters, $$value => $$invalidate(6, $filters = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("NameSearch", slots, []);
    	let { textSearch = "" } = $$props;
    	let value = "";
    	let index;

    	function _search() {
    		const matchedRows = index.search(value);
    		const matchedIds = matchedRows.map(item => item.id);

    		//remove existing filter
    		const _filters = $filters;

    		const filter = _filters.findIndex(f => f.label === "name");
    		if (filter > -1) _filters.splice(filter, 1);

    		//generate new filter
    		const nameFilter = {
    			label: "name",
    			filter: row => {
    				if (!value.trim()) return true;
    				return matchedIds.includes(row.id);
    			}
    		};

    		filters.set([..._filters, nameFilter]);
    	}

    	const writable_props = ["textSearch"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NameSearch> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("textSearch" in $$props) $$invalidate(2, textSearch = $$props.textSearch);
    	};

    	$$self.$capture_state = () => ({
    		rows,
    		filters,
    		FlexSearch: flexsearch_min,
    		textSearch,
    		value,
    		index,
    		_search,
    		$rows,
    		$filters
    	});

    	$$self.$inject_state = $$props => {
    		if ("textSearch" in $$props) $$invalidate(2, textSearch = $$props.textSearch);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("index" in $$props) $$invalidate(3, index = $$props.index);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$rows, index*/ 24) {
    			 if ($rows) {
    				$$invalidate(3, index = new flexsearch_min({
    						tokenize: "full",
    						encode: "advanced",
    						cache: false,
    						async: false,
    						worker: false,
    						threshold: 0,
    						depth: 0,
    						doc: {
    							id: "id",
    							field: [
    								"Institution Name",
    								"Library Name",
    								"Location",
    								"Contact Title",
    								"Contact Name",
    								"Contact Phone",
    								"Contact Email",
    								"Program Overview",
    								"Location",
    								"Established Year"
    							]
    						}
    					}));

    				index.add($rows);
    			}
    		}
    	};

    	return [value, _search, textSearch, index, $rows, input_input_handler];
    }

    class NameSearch extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { textSearch: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NameSearch",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get textSearch() {
    		throw new Error("<NameSearch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set textSearch(value) {
    		throw new Error("<NameSearch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/sidebar/RowItem.svelte generated by Svelte v3.35.0 */
    const file$a = "src/components/sidebar/RowItem.svelte";

    // (23:8) {#if location}
    function create_if_block_1(ctx) {
    	let p;
    	let t_value = /*item*/ ctx[0].Location + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "is-6 subtitle is-marginless notranslate");
    			attr_dev(p, "translate", "no");
    			add_location(p, file$a, 23, 8, 931);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*item*/ 1 && t_value !== (t_value = /*item*/ ctx[0].Location + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(23:8) {#if location}",
    		ctx
    	});

    	return block;
    }

    // (26:8) {#if estYear}
    function create_if_block$2(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*item*/ ctx[0]["Established Year"] + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Est. ");
    			t1 = text(t1_value);
    			attr_dev(p, "class", "is-6 subtitle is-marginless notranslate");
    			attr_dev(p, "translate", "no");
    			add_location(p, file$a, 26, 8, 1061);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*item*/ 1 && t1_value !== (t1_value = /*item*/ ctx[0]["Established Year"] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(26:8) {#if estYear}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let div;
    	let a;
    	let p0;
    	let strong;
    	let t0_value = /*item*/ ctx[0]["Institution Name"] + "";
    	let t0;
    	let t1;
    	let p1;
    	let t2_value = /*item*/ ctx[0]["Library Name"] + "";
    	let t2;
    	let t3;
    	let t4;
    	let mounted;
    	let dispose;
    	let if_block0 = /*location*/ ctx[1] && create_if_block_1(ctx);
    	let if_block1 = /*estYear*/ ctx[2] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			p0 = element("p");
    			strong = element("strong");
    			t0 = text(t0_value);
    			t1 = space();
    			p1 = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			if (if_block0) if_block0.c();
    			t4 = space();
    			if (if_block1) if_block1.c();
    			add_location(strong, file$a, 20, 74, 751);
    			attr_dev(p0, "class", "is-6 subtitle is-marginless notranslate");
    			attr_dev(p0, "translate", "no");
    			add_location(p0, file$a, 20, 8, 685);
    			attr_dev(p1, "class", "is-6 subtitle is-marginless notranslate");
    			attr_dev(p1, "translate", "no");
    			add_location(p1, file$a, 21, 8, 807);
    			attr_dev(a, "class", "link svelte-lhwfi1");
    			attr_dev(a, "role", "listitem");
    			attr_dev(a, "href", "#");
    			add_location(a, file$a, 19, 4, 601);
    			attr_dev(div, "class", "item svelte-lhwfi1");
    			add_location(div, file$a, 18, 0, 578);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, p0);
    			append_dev(p0, strong);
    			append_dev(strong, t0);
    			append_dev(a, t1);
    			append_dev(a, p1);
    			append_dev(p1, t2);
    			append_dev(a, t3);
    			if (if_block0) if_block0.m(a, null);
    			append_dev(a, t4);
    			if (if_block1) if_block1.m(a, null);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*click_handler*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*item*/ 1 && t0_value !== (t0_value = /*item*/ ctx[0]["Institution Name"] + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*item*/ 1 && t2_value !== (t2_value = /*item*/ ctx[0]["Library Name"] + "")) set_data_dev(t2, t2_value);

    			if (/*location*/ ctx[1]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(a, t4);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*estYear*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					if_block1.m(a, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let socialBlog;
    	let socialMedia;
    	let website;
    	let email;
    	let location;
    	let estYear;
    	let $mapObject;
    	validate_store(mapObject, "mapObject");
    	component_subscribe($$self, mapObject, $$value => $$invalidate(5, $mapObject = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("RowItem", slots, []);
    	let { item } = $$props;

    	function selectItem(item) {
    		selectedItem.select(item, $mapObject, item.coordinates);
    	}

    	const writable_props = ["item"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<RowItem> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => selectItem(item);

    	$$self.$$set = $$props => {
    		if ("item" in $$props) $$invalidate(0, item = $$props.item);
    	};

    	$$self.$capture_state = () => ({
    		selectedItem,
    		mapObject,
    		MaterialIcon,
    		item,
    		selectItem,
    		$mapObject,
    		socialBlog,
    		socialMedia,
    		website,
    		email,
    		location,
    		estYear
    	});

    	$$self.$inject_state = $$props => {
    		if ("item" in $$props) $$invalidate(0, item = $$props.item);
    		if ("socialBlog" in $$props) socialBlog = $$props.socialBlog;
    		if ("socialMedia" in $$props) socialMedia = $$props.socialMedia;
    		if ("website" in $$props) website = $$props.website;
    		if ("email" in $$props) email = $$props.email;
    		if ("location" in $$props) $$invalidate(1, location = $$props.location);
    		if ("estYear" in $$props) $$invalidate(2, estYear = $$props.estYear);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*item*/ 1) {
    			 socialBlog = item["Social Media - Blog"].trim().length;
    		}

    		if ($$self.$$.dirty & /*item*/ 1) {
    			 socialMedia = item["Social Media - Facebook"].trim().length;
    		}

    		if ($$self.$$.dirty & /*item*/ 1) {
    			 website = item["Website"].trim().length;
    		}

    		if ($$self.$$.dirty & /*item*/ 1) {
    			 email = item["Email"].trim().length;
    		}

    		if ($$self.$$.dirty & /*item*/ 1) {
    			 $$invalidate(1, location = item["Location"].trim().length);
    		}

    		if ($$self.$$.dirty & /*item*/ 1) {
    			 $$invalidate(2, estYear = item["Established Year"].trim().length);
    		}
    	};

    	return [item, location, estYear, selectItem, click_handler];
    }

    class RowItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { item: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RowItem",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*item*/ ctx[0] === undefined && !("item" in props)) {
    			console.warn("<RowItem> was created without expected prop 'item'");
    		}
    	}

    	get item() {
    		throw new Error("<RowItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<RowItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/sidebar/RowItems.svelte generated by Svelte v3.35.0 */

    const { console: console_1 } = globals;
    const file$b = "src/components/sidebar/RowItems.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (12:4) {#each items as item (item.id) }
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let rowitem;
    	let current;

    	rowitem = new RowItem({
    			props: { item: /*item*/ ctx[2] },
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(rowitem.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(rowitem, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const rowitem_changes = {};
    			if (dirty & /*items*/ 2) rowitem_changes.item = /*item*/ ctx[2];
    			rowitem.$set(rowitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rowitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rowitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(rowitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(12:4) {#each items as item (item.id) }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let div;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let div_class_value;
    	let current;
    	let each_value = /*items*/ ctx[1];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*item*/ ctx[2].id;
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", div_class_value = "listings " + (/*show*/ ctx[0] ? "" : "is-hidden") + " svelte-10y0qg8");
    			attr_dev(div, "role", "list");
    			attr_dev(div, "aria-label", "listings");
    			add_location(div, file$b, 10, 0, 181);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*items*/ 2) {
    				each_value = /*items*/ ctx[1];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    				check_outros();
    			}

    			if (!current || dirty & /*show*/ 1 && div_class_value !== (div_class_value = "listings " + (/*show*/ ctx[0] ? "" : "is-hidden") + " svelte-10y0qg8")) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("RowItems", slots, []);
    	let { show } = $$props;
    	let { items } = $$props;
    	console.log(items);

    	for (i in items) {
    		console.log(i.id);
    	}

    	const writable_props = ["show", "items"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<RowItems> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    		if ("items" in $$props) $$invalidate(1, items = $$props.items);
    	};

    	$$self.$capture_state = () => ({ RowItem, show, items });

    	$$self.$inject_state = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    		if ("items" in $$props) $$invalidate(1, items = $$props.items);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [show, items];
    }

    class RowItems extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { show: 0, items: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RowItems",
    			options,
    			id: create_fragment$b.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*show*/ ctx[0] === undefined && !("show" in props)) {
    			console_1.warn("<RowItems> was created without expected prop 'show'");
    		}

    		if (/*items*/ ctx[1] === undefined && !("items" in props)) {
    			console_1.warn("<RowItems> was created without expected prop 'items'");
    		}
    	}

    	get show() {
    		throw new Error("<RowItems>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show(value) {
    		throw new Error("<RowItems>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get items() {
    		throw new Error("<RowItems>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<RowItems>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var marked = createCommonjsModule(function (module, exports) {
    /**
     * marked - a markdown parser
     * Copyright (c) 2011-2021, Christopher Jeffrey. (MIT Licensed)
     * https://github.com/markedjs/marked
     */

    /**
     * DO NOT EDIT THIS FILE
     * The code in this file is generated from files in ./src/
     */

    (function (global, factory) {
       module.exports = factory() ;
    }(commonjsGlobal, (function () {
      function _defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
          var descriptor = props[i];
          descriptor.enumerable = descriptor.enumerable || false;
          descriptor.configurable = true;
          if ("value" in descriptor) descriptor.writable = true;
          Object.defineProperty(target, descriptor.key, descriptor);
        }
      }

      function _createClass(Constructor, protoProps, staticProps) {
        if (protoProps) _defineProperties(Constructor.prototype, protoProps);
        if (staticProps) _defineProperties(Constructor, staticProps);
        return Constructor;
      }

      function _unsupportedIterableToArray(o, minLen) {
        if (!o) return;
        if (typeof o === "string") return _arrayLikeToArray(o, minLen);
        var n = Object.prototype.toString.call(o).slice(8, -1);
        if (n === "Object" && o.constructor) n = o.constructor.name;
        if (n === "Map" || n === "Set") return Array.from(o);
        if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
      }

      function _arrayLikeToArray(arr, len) {
        if (len == null || len > arr.length) len = arr.length;

        for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

        return arr2;
      }

      function _createForOfIteratorHelperLoose(o, allowArrayLike) {
        var it;

        if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) {
          if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
            if (it) o = it;
            var i = 0;
            return function () {
              if (i >= o.length) return {
                done: true
              };
              return {
                done: false,
                value: o[i++]
              };
            };
          }

          throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
        }

        it = o[Symbol.iterator]();
        return it.next.bind(it);
      }

      function createCommonjsModule(fn) {
        var module = { exports: {} };
      	return fn(module, module.exports), module.exports;
      }

      var defaults = createCommonjsModule(function (module) {
        function getDefaults() {
          return {
            baseUrl: null,
            breaks: false,
            gfm: true,
            headerIds: true,
            headerPrefix: '',
            highlight: null,
            langPrefix: 'language-',
            mangle: true,
            pedantic: false,
            renderer: null,
            sanitize: false,
            sanitizer: null,
            silent: false,
            smartLists: false,
            smartypants: false,
            tokenizer: null,
            walkTokens: null,
            xhtml: false
          };
        }

        function changeDefaults(newDefaults) {
          module.exports.defaults = newDefaults;
        }

        module.exports = {
          defaults: getDefaults(),
          getDefaults: getDefaults,
          changeDefaults: changeDefaults
        };
      });

      /**
       * Helpers
       */
      var escapeTest = /[&<>"']/;
      var escapeReplace = /[&<>"']/g;
      var escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
      var escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;
      var escapeReplacements = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };

      var getEscapeReplacement = function getEscapeReplacement(ch) {
        return escapeReplacements[ch];
      };

      function escape(html, encode) {
        if (encode) {
          if (escapeTest.test(html)) {
            return html.replace(escapeReplace, getEscapeReplacement);
          }
        } else {
          if (escapeTestNoEncode.test(html)) {
            return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
          }
        }

        return html;
      }

      var unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;

      function unescape(html) {
        // explicitly match decimal, hex, and named HTML entities
        return html.replace(unescapeTest, function (_, n) {
          n = n.toLowerCase();
          if (n === 'colon') return ':';

          if (n.charAt(0) === '#') {
            return n.charAt(1) === 'x' ? String.fromCharCode(parseInt(n.substring(2), 16)) : String.fromCharCode(+n.substring(1));
          }

          return '';
        });
      }

      var caret = /(^|[^\[])\^/g;

      function edit(regex, opt) {
        regex = regex.source || regex;
        opt = opt || '';
        var obj = {
          replace: function replace(name, val) {
            val = val.source || val;
            val = val.replace(caret, '$1');
            regex = regex.replace(name, val);
            return obj;
          },
          getRegex: function getRegex() {
            return new RegExp(regex, opt);
          }
        };
        return obj;
      }

      var nonWordAndColonTest = /[^\w:]/g;
      var originIndependentUrl = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;

      function cleanUrl(sanitize, base, href) {
        if (sanitize) {
          var prot;

          try {
            prot = decodeURIComponent(unescape(href)).replace(nonWordAndColonTest, '').toLowerCase();
          } catch (e) {
            return null;
          }

          if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
            return null;
          }
        }

        if (base && !originIndependentUrl.test(href)) {
          href = resolveUrl(base, href);
        }

        try {
          href = encodeURI(href).replace(/%25/g, '%');
        } catch (e) {
          return null;
        }

        return href;
      }

      var baseUrls = {};
      var justDomain = /^[^:]+:\/*[^/]*$/;
      var protocol = /^([^:]+:)[\s\S]*$/;
      var domain = /^([^:]+:\/*[^/]*)[\s\S]*$/;

      function resolveUrl(base, href) {
        if (!baseUrls[' ' + base]) {
          // we can ignore everything in base after the last slash of its path component,
          // but we might need to add _that_
          // https://tools.ietf.org/html/rfc3986#section-3
          if (justDomain.test(base)) {
            baseUrls[' ' + base] = base + '/';
          } else {
            baseUrls[' ' + base] = rtrim(base, '/', true);
          }
        }

        base = baseUrls[' ' + base];
        var relativeBase = base.indexOf(':') === -1;

        if (href.substring(0, 2) === '//') {
          if (relativeBase) {
            return href;
          }

          return base.replace(protocol, '$1') + href;
        } else if (href.charAt(0) === '/') {
          if (relativeBase) {
            return href;
          }

          return base.replace(domain, '$1') + href;
        } else {
          return base + href;
        }
      }

      var noopTest = {
        exec: function noopTest() {}
      };

      function merge(obj) {
        var i = 1,
            target,
            key;

        for (; i < arguments.length; i++) {
          target = arguments[i];

          for (key in target) {
            if (Object.prototype.hasOwnProperty.call(target, key)) {
              obj[key] = target[key];
            }
          }
        }

        return obj;
      }

      function splitCells(tableRow, count) {
        // ensure that every cell-delimiting pipe has a space
        // before it to distinguish it from an escaped pipe
        var row = tableRow.replace(/\|/g, function (match, offset, str) {
          var escaped = false,
              curr = offset;

          while (--curr >= 0 && str[curr] === '\\') {
            escaped = !escaped;
          }

          if (escaped) {
            // odd number of slashes means | is escaped
            // so we leave it alone
            return '|';
          } else {
            // add space before unescaped |
            return ' |';
          }
        }),
            cells = row.split(/ \|/);
        var i = 0;

        if (cells.length > count) {
          cells.splice(count);
        } else {
          while (cells.length < count) {
            cells.push('');
          }
        }

        for (; i < cells.length; i++) {
          // leading or trailing whitespace is ignored per the gfm spec
          cells[i] = cells[i].trim().replace(/\\\|/g, '|');
        }

        return cells;
      } // Remove trailing 'c's. Equivalent to str.replace(/c*$/, '').
      // /c*$/ is vulnerable to REDOS.
      // invert: Remove suffix of non-c chars instead. Default falsey.


      function rtrim(str, c, invert) {
        var l = str.length;

        if (l === 0) {
          return '';
        } // Length of suffix matching the invert condition.


        var suffLen = 0; // Step left until we fail to match the invert condition.

        while (suffLen < l) {
          var currChar = str.charAt(l - suffLen - 1);

          if (currChar === c && !invert) {
            suffLen++;
          } else if (currChar !== c && invert) {
            suffLen++;
          } else {
            break;
          }
        }

        return str.substr(0, l - suffLen);
      }

      function findClosingBracket(str, b) {
        if (str.indexOf(b[1]) === -1) {
          return -1;
        }

        var l = str.length;
        var level = 0,
            i = 0;

        for (; i < l; i++) {
          if (str[i] === '\\') {
            i++;
          } else if (str[i] === b[0]) {
            level++;
          } else if (str[i] === b[1]) {
            level--;

            if (level < 0) {
              return i;
            }
          }
        }

        return -1;
      }

      function checkSanitizeDeprecation(opt) {
        if (opt && opt.sanitize && !opt.silent) {
          console.warn('marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options');
        }
      } // copied from https://stackoverflow.com/a/5450113/806777


      function repeatString(pattern, count) {
        if (count < 1) {
          return '';
        }

        var result = '';

        while (count > 1) {
          if (count & 1) {
            result += pattern;
          }

          count >>= 1;
          pattern += pattern;
        }

        return result + pattern;
      }

      var helpers = {
        escape: escape,
        unescape: unescape,
        edit: edit,
        cleanUrl: cleanUrl,
        resolveUrl: resolveUrl,
        noopTest: noopTest,
        merge: merge,
        splitCells: splitCells,
        rtrim: rtrim,
        findClosingBracket: findClosingBracket,
        checkSanitizeDeprecation: checkSanitizeDeprecation,
        repeatString: repeatString
      };

      var defaults$1 = defaults.defaults;
      var rtrim$1 = helpers.rtrim,
          splitCells$1 = helpers.splitCells,
          _escape = helpers.escape,
          findClosingBracket$1 = helpers.findClosingBracket;

      function outputLink(cap, link, raw) {
        var href = link.href;
        var title = link.title ? _escape(link.title) : null;
        var text = cap[1].replace(/\\([\[\]])/g, '$1');

        if (cap[0].charAt(0) !== '!') {
          return {
            type: 'link',
            raw: raw,
            href: href,
            title: title,
            text: text
          };
        } else {
          return {
            type: 'image',
            raw: raw,
            href: href,
            title: title,
            text: _escape(text)
          };
        }
      }

      function indentCodeCompensation(raw, text) {
        var matchIndentToCode = raw.match(/^(\s+)(?:```)/);

        if (matchIndentToCode === null) {
          return text;
        }

        var indentToCode = matchIndentToCode[1];
        return text.split('\n').map(function (node) {
          var matchIndentInNode = node.match(/^\s+/);

          if (matchIndentInNode === null) {
            return node;
          }

          var indentInNode = matchIndentInNode[0];

          if (indentInNode.length >= indentToCode.length) {
            return node.slice(indentToCode.length);
          }

          return node;
        }).join('\n');
      }
      /**
       * Tokenizer
       */


      var Tokenizer_1 = /*#__PURE__*/function () {
        function Tokenizer(options) {
          this.options = options || defaults$1;
        }

        var _proto = Tokenizer.prototype;

        _proto.space = function space(src) {
          var cap = this.rules.block.newline.exec(src);

          if (cap) {
            if (cap[0].length > 1) {
              return {
                type: 'space',
                raw: cap[0]
              };
            }

            return {
              raw: '\n'
            };
          }
        };

        _proto.code = function code(src, tokens) {
          var cap = this.rules.block.code.exec(src);

          if (cap) {
            var lastToken = tokens[tokens.length - 1]; // An indented code block cannot interrupt a paragraph.

            if (lastToken && lastToken.type === 'paragraph') {
              return {
                raw: cap[0],
                text: cap[0].trimRight()
              };
            }

            var text = cap[0].replace(/^ {1,4}/gm, '');
            return {
              type: 'code',
              raw: cap[0],
              codeBlockStyle: 'indented',
              text: !this.options.pedantic ? rtrim$1(text, '\n') : text
            };
          }
        };

        _proto.fences = function fences(src) {
          var cap = this.rules.block.fences.exec(src);

          if (cap) {
            var raw = cap[0];
            var text = indentCodeCompensation(raw, cap[3] || '');
            return {
              type: 'code',
              raw: raw,
              lang: cap[2] ? cap[2].trim() : cap[2],
              text: text
            };
          }
        };

        _proto.heading = function heading(src) {
          var cap = this.rules.block.heading.exec(src);

          if (cap) {
            var text = cap[2].trim(); // remove trailing #s

            if (/#$/.test(text)) {
              var trimmed = rtrim$1(text, '#');

              if (this.options.pedantic) {
                text = trimmed.trim();
              } else if (!trimmed || / $/.test(trimmed)) {
                // CommonMark requires space before trailing #s
                text = trimmed.trim();
              }
            }

            return {
              type: 'heading',
              raw: cap[0],
              depth: cap[1].length,
              text: text
            };
          }
        };

        _proto.nptable = function nptable(src) {
          var cap = this.rules.block.nptable.exec(src);

          if (cap) {
            var item = {
              type: 'table',
              header: splitCells$1(cap[1].replace(/^ *| *\| *$/g, '')),
              align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
              cells: cap[3] ? cap[3].replace(/\n$/, '').split('\n') : [],
              raw: cap[0]
            };

            if (item.header.length === item.align.length) {
              var l = item.align.length;
              var i;

              for (i = 0; i < l; i++) {
                if (/^ *-+: *$/.test(item.align[i])) {
                  item.align[i] = 'right';
                } else if (/^ *:-+: *$/.test(item.align[i])) {
                  item.align[i] = 'center';
                } else if (/^ *:-+ *$/.test(item.align[i])) {
                  item.align[i] = 'left';
                } else {
                  item.align[i] = null;
                }
              }

              l = item.cells.length;

              for (i = 0; i < l; i++) {
                item.cells[i] = splitCells$1(item.cells[i], item.header.length);
              }

              return item;
            }
          }
        };

        _proto.hr = function hr(src) {
          var cap = this.rules.block.hr.exec(src);

          if (cap) {
            return {
              type: 'hr',
              raw: cap[0]
            };
          }
        };

        _proto.blockquote = function blockquote(src) {
          var cap = this.rules.block.blockquote.exec(src);

          if (cap) {
            var text = cap[0].replace(/^ *> ?/gm, '');
            return {
              type: 'blockquote',
              raw: cap[0],
              text: text
            };
          }
        };

        _proto.list = function list(src) {
          var cap = this.rules.block.list.exec(src);

          if (cap) {
            var raw = cap[0];
            var bull = cap[2];
            var isordered = bull.length > 1;
            var list = {
              type: 'list',
              raw: raw,
              ordered: isordered,
              start: isordered ? +bull.slice(0, -1) : '',
              loose: false,
              items: []
            }; // Get each top-level item.

            var itemMatch = cap[0].match(this.rules.block.item);
            var next = false,
                item,
                space,
                bcurr,
                bnext,
                addBack,
                loose,
                istask,
                ischecked;
            var l = itemMatch.length;
            bcurr = this.rules.block.listItemStart.exec(itemMatch[0]);

            for (var i = 0; i < l; i++) {
              item = itemMatch[i];
              raw = item; // Determine whether the next list item belongs here.
              // Backpedal if it does not belong in this list.

              if (i !== l - 1) {
                bnext = this.rules.block.listItemStart.exec(itemMatch[i + 1]);

                if (!this.options.pedantic ? bnext[1].length > bcurr[0].length || bnext[1].length > 3 : bnext[1].length > bcurr[1].length) {
                  // nested list
                  itemMatch.splice(i, 2, itemMatch[i] + '\n' + itemMatch[i + 1]);
                  i--;
                  l--;
                  continue;
                } else {
                  if ( // different bullet style
                  !this.options.pedantic || this.options.smartLists ? bnext[2][bnext[2].length - 1] !== bull[bull.length - 1] : isordered === (bnext[2].length === 1)) {
                    addBack = itemMatch.slice(i + 1).join('\n');
                    list.raw = list.raw.substring(0, list.raw.length - addBack.length);
                    i = l - 1;
                  }
                }

                bcurr = bnext;
              } // Remove the list item's bullet
              // so it is seen as the next token.


              space = item.length;
              item = item.replace(/^ *([*+-]|\d+[.)]) ?/, ''); // Outdent whatever the
              // list item contains. Hacky.

              if (~item.indexOf('\n ')) {
                space -= item.length;
                item = !this.options.pedantic ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '') : item.replace(/^ {1,4}/gm, '');
              } // Determine whether item is loose or not.
              // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
              // for discount behavior.


              loose = next || /\n\n(?!\s*$)/.test(item);

              if (i !== l - 1) {
                next = item.charAt(item.length - 1) === '\n';
                if (!loose) loose = next;
              }

              if (loose) {
                list.loose = true;
              } // Check for task list items


              if (this.options.gfm) {
                istask = /^\[[ xX]\] /.test(item);
                ischecked = undefined;

                if (istask) {
                  ischecked = item[1] !== ' ';
                  item = item.replace(/^\[[ xX]\] +/, '');
                }
              }

              list.items.push({
                type: 'list_item',
                raw: raw,
                task: istask,
                checked: ischecked,
                loose: loose,
                text: item
              });
            }

            return list;
          }
        };

        _proto.html = function html(src) {
          var cap = this.rules.block.html.exec(src);

          if (cap) {
            return {
              type: this.options.sanitize ? 'paragraph' : 'html',
              raw: cap[0],
              pre: !this.options.sanitizer && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
              text: this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : _escape(cap[0]) : cap[0]
            };
          }
        };

        _proto.def = function def(src) {
          var cap = this.rules.block.def.exec(src);

          if (cap) {
            if (cap[3]) cap[3] = cap[3].substring(1, cap[3].length - 1);
            var tag = cap[1].toLowerCase().replace(/\s+/g, ' ');
            return {
              tag: tag,
              raw: cap[0],
              href: cap[2],
              title: cap[3]
            };
          }
        };

        _proto.table = function table(src) {
          var cap = this.rules.block.table.exec(src);

          if (cap) {
            var item = {
              type: 'table',
              header: splitCells$1(cap[1].replace(/^ *| *\| *$/g, '')),
              align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
              cells: cap[3] ? cap[3].replace(/\n$/, '').split('\n') : []
            };

            if (item.header.length === item.align.length) {
              item.raw = cap[0];
              var l = item.align.length;
              var i;

              for (i = 0; i < l; i++) {
                if (/^ *-+: *$/.test(item.align[i])) {
                  item.align[i] = 'right';
                } else if (/^ *:-+: *$/.test(item.align[i])) {
                  item.align[i] = 'center';
                } else if (/^ *:-+ *$/.test(item.align[i])) {
                  item.align[i] = 'left';
                } else {
                  item.align[i] = null;
                }
              }

              l = item.cells.length;

              for (i = 0; i < l; i++) {
                item.cells[i] = splitCells$1(item.cells[i].replace(/^ *\| *| *\| *$/g, ''), item.header.length);
              }

              return item;
            }
          }
        };

        _proto.lheading = function lheading(src) {
          var cap = this.rules.block.lheading.exec(src);

          if (cap) {
            return {
              type: 'heading',
              raw: cap[0],
              depth: cap[2].charAt(0) === '=' ? 1 : 2,
              text: cap[1]
            };
          }
        };

        _proto.paragraph = function paragraph(src) {
          var cap = this.rules.block.paragraph.exec(src);

          if (cap) {
            return {
              type: 'paragraph',
              raw: cap[0],
              text: cap[1].charAt(cap[1].length - 1) === '\n' ? cap[1].slice(0, -1) : cap[1]
            };
          }
        };

        _proto.text = function text(src, tokens) {
          var cap = this.rules.block.text.exec(src);

          if (cap) {
            var lastToken = tokens[tokens.length - 1];

            if (lastToken && lastToken.type === 'text') {
              return {
                raw: cap[0],
                text: cap[0]
              };
            }

            return {
              type: 'text',
              raw: cap[0],
              text: cap[0]
            };
          }
        };

        _proto.escape = function escape(src) {
          var cap = this.rules.inline.escape.exec(src);

          if (cap) {
            return {
              type: 'escape',
              raw: cap[0],
              text: _escape(cap[1])
            };
          }
        };

        _proto.tag = function tag(src, inLink, inRawBlock) {
          var cap = this.rules.inline.tag.exec(src);

          if (cap) {
            if (!inLink && /^<a /i.test(cap[0])) {
              inLink = true;
            } else if (inLink && /^<\/a>/i.test(cap[0])) {
              inLink = false;
            }

            if (!inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
              inRawBlock = true;
            } else if (inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
              inRawBlock = false;
            }

            return {
              type: this.options.sanitize ? 'text' : 'html',
              raw: cap[0],
              inLink: inLink,
              inRawBlock: inRawBlock,
              text: this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : _escape(cap[0]) : cap[0]
            };
          }
        };

        _proto.link = function link(src) {
          var cap = this.rules.inline.link.exec(src);

          if (cap) {
            var trimmedUrl = cap[2].trim();

            if (!this.options.pedantic && /^</.test(trimmedUrl)) {
              // commonmark requires matching angle brackets
              if (!/>$/.test(trimmedUrl)) {
                return;
              } // ending angle bracket cannot be escaped


              var rtrimSlash = rtrim$1(trimmedUrl.slice(0, -1), '\\');

              if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
                return;
              }
            } else {
              // find closing parenthesis
              var lastParenIndex = findClosingBracket$1(cap[2], '()');

              if (lastParenIndex > -1) {
                var start = cap[0].indexOf('!') === 0 ? 5 : 4;
                var linkLen = start + cap[1].length + lastParenIndex;
                cap[2] = cap[2].substring(0, lastParenIndex);
                cap[0] = cap[0].substring(0, linkLen).trim();
                cap[3] = '';
              }
            }

            var href = cap[2];
            var title = '';

            if (this.options.pedantic) {
              // split pedantic href and title
              var link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);

              if (link) {
                href = link[1];
                title = link[3];
              }
            } else {
              title = cap[3] ? cap[3].slice(1, -1) : '';
            }

            href = href.trim();

            if (/^</.test(href)) {
              if (this.options.pedantic && !/>$/.test(trimmedUrl)) {
                // pedantic allows starting angle bracket without ending angle bracket
                href = href.slice(1);
              } else {
                href = href.slice(1, -1);
              }
            }

            return outputLink(cap, {
              href: href ? href.replace(this.rules.inline._escapes, '$1') : href,
              title: title ? title.replace(this.rules.inline._escapes, '$1') : title
            }, cap[0]);
          }
        };

        _proto.reflink = function reflink(src, links) {
          var cap;

          if ((cap = this.rules.inline.reflink.exec(src)) || (cap = this.rules.inline.nolink.exec(src))) {
            var link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
            link = links[link.toLowerCase()];

            if (!link || !link.href) {
              var text = cap[0].charAt(0);
              return {
                type: 'text',
                raw: text,
                text: text
              };
            }

            return outputLink(cap, link, cap[0]);
          }
        };

        _proto.strong = function strong(src, maskedSrc, prevChar) {
          if (prevChar === void 0) {
            prevChar = '';
          }

          var match = this.rules.inline.strong.start.exec(src);

          if (match && (!match[1] || match[1] && (prevChar === '' || this.rules.inline.punctuation.exec(prevChar)))) {
            maskedSrc = maskedSrc.slice(-1 * src.length);
            var endReg = match[0] === '**' ? this.rules.inline.strong.endAst : this.rules.inline.strong.endUnd;
            endReg.lastIndex = 0;
            var cap;

            while ((match = endReg.exec(maskedSrc)) != null) {
              cap = this.rules.inline.strong.middle.exec(maskedSrc.slice(0, match.index + 3));

              if (cap) {
                return {
                  type: 'strong',
                  raw: src.slice(0, cap[0].length),
                  text: src.slice(2, cap[0].length - 2)
                };
              }
            }
          }
        };

        _proto.em = function em(src, maskedSrc, prevChar) {
          if (prevChar === void 0) {
            prevChar = '';
          }

          var match = this.rules.inline.em.start.exec(src);

          if (match && (!match[1] || match[1] && (prevChar === '' || this.rules.inline.punctuation.exec(prevChar)))) {
            maskedSrc = maskedSrc.slice(-1 * src.length);
            var endReg = match[0] === '*' ? this.rules.inline.em.endAst : this.rules.inline.em.endUnd;
            endReg.lastIndex = 0;
            var cap;

            while ((match = endReg.exec(maskedSrc)) != null) {
              cap = this.rules.inline.em.middle.exec(maskedSrc.slice(0, match.index + 2));

              if (cap) {
                return {
                  type: 'em',
                  raw: src.slice(0, cap[0].length),
                  text: src.slice(1, cap[0].length - 1)
                };
              }
            }
          }
        };

        _proto.codespan = function codespan(src) {
          var cap = this.rules.inline.code.exec(src);

          if (cap) {
            var text = cap[2].replace(/\n/g, ' ');
            var hasNonSpaceChars = /[^ ]/.test(text);
            var hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);

            if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
              text = text.substring(1, text.length - 1);
            }

            text = _escape(text, true);
            return {
              type: 'codespan',
              raw: cap[0],
              text: text
            };
          }
        };

        _proto.br = function br(src) {
          var cap = this.rules.inline.br.exec(src);

          if (cap) {
            return {
              type: 'br',
              raw: cap[0]
            };
          }
        };

        _proto.del = function del(src) {
          var cap = this.rules.inline.del.exec(src);

          if (cap) {
            return {
              type: 'del',
              raw: cap[0],
              text: cap[2]
            };
          }
        };

        _proto.autolink = function autolink(src, mangle) {
          var cap = this.rules.inline.autolink.exec(src);

          if (cap) {
            var text, href;

            if (cap[2] === '@') {
              text = _escape(this.options.mangle ? mangle(cap[1]) : cap[1]);
              href = 'mailto:' + text;
            } else {
              text = _escape(cap[1]);
              href = text;
            }

            return {
              type: 'link',
              raw: cap[0],
              text: text,
              href: href,
              tokens: [{
                type: 'text',
                raw: text,
                text: text
              }]
            };
          }
        };

        _proto.url = function url(src, mangle) {
          var cap;

          if (cap = this.rules.inline.url.exec(src)) {
            var text, href;

            if (cap[2] === '@') {
              text = _escape(this.options.mangle ? mangle(cap[0]) : cap[0]);
              href = 'mailto:' + text;
            } else {
              // do extended autolink path validation
              var prevCapZero;

              do {
                prevCapZero = cap[0];
                cap[0] = this.rules.inline._backpedal.exec(cap[0])[0];
              } while (prevCapZero !== cap[0]);

              text = _escape(cap[0]);

              if (cap[1] === 'www.') {
                href = 'http://' + text;
              } else {
                href = text;
              }
            }

            return {
              type: 'link',
              raw: cap[0],
              text: text,
              href: href,
              tokens: [{
                type: 'text',
                raw: text,
                text: text
              }]
            };
          }
        };

        _proto.inlineText = function inlineText(src, inRawBlock, smartypants) {
          var cap = this.rules.inline.text.exec(src);

          if (cap) {
            var text;

            if (inRawBlock) {
              text = this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : _escape(cap[0]) : cap[0];
            } else {
              text = _escape(this.options.smartypants ? smartypants(cap[0]) : cap[0]);
            }

            return {
              type: 'text',
              raw: cap[0],
              text: text
            };
          }
        };

        return Tokenizer;
      }();

      var noopTest$1 = helpers.noopTest,
          edit$1 = helpers.edit,
          merge$1 = helpers.merge;
      /**
       * Block-Level Grammar
       */

      var block = {
        newline: /^(?: *(?:\n|$))+/,
        code: /^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/,
        fences: /^ {0,3}(`{3,}(?=[^`\n]*\n)|~{3,})([^\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?:\n+|$)|$)/,
        hr: /^ {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)/,
        heading: /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,
        blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
        list: /^( {0,3})(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?! {0,3}bull )\n*|\s*$)/,
        html: '^ {0,3}(?:' // optional indentation
        + '<(script|pre|style)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)' // (1)
        + '|comment[^\\n]*(\\n+|$)' // (2)
        + '|<\\?[\\s\\S]*?(?:\\?>\\n*|$)' // (3)
        + '|<![A-Z][\\s\\S]*?(?:>\\n*|$)' // (4)
        + '|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)' // (5)
        + '|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:\\n{2,}|$)' // (6)
        + '|<(?!script|pre|style)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:\\n{2,}|$)' // (7) open tag
        + '|</(?!script|pre|style)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:\\n{2,}|$)' // (7) closing tag
        + ')',
        def: /^ {0,3}\[(label)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)(title))? *(?:\n+|$)/,
        nptable: noopTest$1,
        table: noopTest$1,
        lheading: /^([^\n]+)\n {0,3}(=+|-+) *(?:\n+|$)/,
        // regex template, placeholders will be replaced according to different paragraph
        // interruption rules of commonmark and the original markdown spec:
        _paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html| +\n)[^\n]+)*)/,
        text: /^[^\n]+/
      };
      block._label = /(?!\s*\])(?:\\[\[\]]|[^\[\]])+/;
      block._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
      block.def = edit$1(block.def).replace('label', block._label).replace('title', block._title).getRegex();
      block.bullet = /(?:[*+-]|\d{1,9}[.)])/;
      block.item = /^( *)(bull) ?[^\n]*(?:\n(?! *bull ?)[^\n]*)*/;
      block.item = edit$1(block.item, 'gm').replace(/bull/g, block.bullet).getRegex();
      block.listItemStart = edit$1(/^( *)(bull)/).replace('bull', block.bullet).getRegex();
      block.list = edit$1(block.list).replace(/bull/g, block.bullet).replace('hr', '\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))').replace('def', '\\n+(?=' + block.def.source + ')').getRegex();
      block._tag = 'address|article|aside|base|basefont|blockquote|body|caption' + '|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption' + '|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe' + '|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option' + '|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr' + '|track|ul';
      block._comment = /<!--(?!-?>)[\s\S]*?(?:-->|$)/;
      block.html = edit$1(block.html, 'i').replace('comment', block._comment).replace('tag', block._tag).replace('attribute', / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
      block.paragraph = edit$1(block._paragraph).replace('hr', block.hr).replace('heading', ' {0,3}#{1,6} ').replace('|lheading', '') // setex headings don't interrupt commonmark paragraphs
      .replace('blockquote', ' {0,3}>').replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n').replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)').replace('tag', block._tag) // pars can be interrupted by type (6) html blocks
      .getRegex();
      block.blockquote = edit$1(block.blockquote).replace('paragraph', block.paragraph).getRegex();
      /**
       * Normal Block Grammar
       */

      block.normal = merge$1({}, block);
      /**
       * GFM Block Grammar
       */

      block.gfm = merge$1({}, block.normal, {
        nptable: '^ *([^|\\n ].*\\|.*)\\n' // Header
        + ' {0,3}([-:]+ *\\|[-| :]*)' // Align
        + '(?:\\n((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)',
        // Cells
        table: '^ *\\|(.+)\\n' // Header
        + ' {0,3}\\|?( *[-:]+[-| :]*)' // Align
        + '(?:\\n *((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)' // Cells

      });
      block.gfm.nptable = edit$1(block.gfm.nptable).replace('hr', block.hr).replace('heading', ' {0,3}#{1,6} ').replace('blockquote', ' {0,3}>').replace('code', ' {4}[^\\n]').replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n').replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)').replace('tag', block._tag) // tables can be interrupted by type (6) html blocks
      .getRegex();
      block.gfm.table = edit$1(block.gfm.table).replace('hr', block.hr).replace('heading', ' {0,3}#{1,6} ').replace('blockquote', ' {0,3}>').replace('code', ' {4}[^\\n]').replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n').replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)').replace('tag', block._tag) // tables can be interrupted by type (6) html blocks
      .getRegex();
      /**
       * Pedantic grammar (original John Gruber's loose markdown specification)
       */

      block.pedantic = merge$1({}, block.normal, {
        html: edit$1('^ *(?:comment *(?:\\n|\\s*$)' + '|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)' // closed tag
        + '|<tag(?:"[^"]*"|\'[^\']*\'|\\s[^\'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))').replace('comment', block._comment).replace(/tag/g, '(?!(?:' + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub' + '|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)' + '\\b)\\w+(?!:|[^\\w\\s@]*@)\\b').getRegex(),
        def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
        heading: /^(#{1,6})(.*)(?:\n+|$)/,
        fences: noopTest$1,
        // fences not supported
        paragraph: edit$1(block.normal._paragraph).replace('hr', block.hr).replace('heading', ' *#{1,6} *[^\n]').replace('lheading', block.lheading).replace('blockquote', ' {0,3}>').replace('|fences', '').replace('|list', '').replace('|html', '').getRegex()
      });
      /**
       * Inline-Level Grammar
       */

      var inline = {
        escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
        autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
        url: noopTest$1,
        tag: '^comment' + '|^</[a-zA-Z][\\w:-]*\\s*>' // self-closing tag
        + '|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>' // open tag
        + '|^<\\?[\\s\\S]*?\\?>' // processing instruction, e.g. <?php ?>
        + '|^<![a-zA-Z]+\\s[\\s\\S]*?>' // declaration, e.g. <!DOCTYPE html>
        + '|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>',
        // CDATA section
        link: /^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,
        reflink: /^!?\[(label)\]\[(?!\s*\])((?:\\[\[\]]?|[^\[\]\\])+)\]/,
        nolink: /^!?\[(?!\s*\])((?:\[[^\[\]]*\]|\\[\[\]]|[^\[\]])*)\](?:\[\])?/,
        reflinkSearch: 'reflink|nolink(?!\\()',
        strong: {
          start: /^(?:(\*\*(?=[*punctuation]))|\*\*)(?![\s])|__/,
          // (1) returns if starts w/ punctuation
          middle: /^\*\*(?:(?:(?!overlapSkip)(?:[^*]|\\\*)|overlapSkip)|\*(?:(?!overlapSkip)(?:[^*]|\\\*)|overlapSkip)*?\*)+?\*\*$|^__(?![\s])((?:(?:(?!overlapSkip)(?:[^_]|\\_)|overlapSkip)|_(?:(?!overlapSkip)(?:[^_]|\\_)|overlapSkip)*?_)+?)__$/,
          endAst: /[^punctuation\s]\*\*(?!\*)|[punctuation]\*\*(?!\*)(?:(?=[punctuation_\s]|$))/,
          // last char can't be punct, or final * must also be followed by punct (or endline)
          endUnd: /[^\s]__(?!_)(?:(?=[punctuation*\s])|$)/ // last char can't be a space, and final _ must preceed punct or \s (or endline)

        },
        em: {
          start: /^(?:(\*(?=[punctuation]))|\*)(?![*\s])|_/,
          // (1) returns if starts w/ punctuation
          middle: /^\*(?:(?:(?!overlapSkip)(?:[^*]|\\\*)|overlapSkip)|\*(?:(?!overlapSkip)(?:[^*]|\\\*)|overlapSkip)*?\*)+?\*$|^_(?![_\s])(?:(?:(?!overlapSkip)(?:[^_]|\\_)|overlapSkip)|_(?:(?!overlapSkip)(?:[^_]|\\_)|overlapSkip)*?_)+?_$/,
          endAst: /[^punctuation\s]\*(?!\*)|[punctuation]\*(?!\*)(?:(?=[punctuation_\s]|$))/,
          // last char can't be punct, or final * must also be followed by punct (or endline)
          endUnd: /[^\s]_(?!_)(?:(?=[punctuation*\s])|$)/ // last char can't be a space, and final _ must preceed punct or \s (or endline)

        },
        code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
        br: /^( {2,}|\\)\n(?!\s*$)/,
        del: noopTest$1,
        text: /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*]|\b_|$)|[^ ](?= {2,}\n)))/,
        punctuation: /^([\s*punctuation])/
      }; // list of punctuation marks from common mark spec
      // without * and _ to workaround cases with double emphasis

      inline._punctuation = '!"#$%&\'()+\\-.,/:;<=>?@\\[\\]`^{|}~';
      inline.punctuation = edit$1(inline.punctuation).replace(/punctuation/g, inline._punctuation).getRegex(); // sequences em should skip over [title](link), `code`, <html>

      inline._blockSkip = '\\[[^\\]]*?\\]\\([^\\)]*?\\)|`[^`]*?`|<[^>]*?>';
      inline._overlapSkip = '__[^_]*?__|\\*\\*\\[^\\*\\]*?\\*\\*';
      inline._comment = edit$1(block._comment).replace('(?:-->|$)', '-->').getRegex();
      inline.em.start = edit$1(inline.em.start).replace(/punctuation/g, inline._punctuation).getRegex();
      inline.em.middle = edit$1(inline.em.middle).replace(/punctuation/g, inline._punctuation).replace(/overlapSkip/g, inline._overlapSkip).getRegex();
      inline.em.endAst = edit$1(inline.em.endAst, 'g').replace(/punctuation/g, inline._punctuation).getRegex();
      inline.em.endUnd = edit$1(inline.em.endUnd, 'g').replace(/punctuation/g, inline._punctuation).getRegex();
      inline.strong.start = edit$1(inline.strong.start).replace(/punctuation/g, inline._punctuation).getRegex();
      inline.strong.middle = edit$1(inline.strong.middle).replace(/punctuation/g, inline._punctuation).replace(/overlapSkip/g, inline._overlapSkip).getRegex();
      inline.strong.endAst = edit$1(inline.strong.endAst, 'g').replace(/punctuation/g, inline._punctuation).getRegex();
      inline.strong.endUnd = edit$1(inline.strong.endUnd, 'g').replace(/punctuation/g, inline._punctuation).getRegex();
      inline.blockSkip = edit$1(inline._blockSkip, 'g').getRegex();
      inline.overlapSkip = edit$1(inline._overlapSkip, 'g').getRegex();
      inline._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;
      inline._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
      inline._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
      inline.autolink = edit$1(inline.autolink).replace('scheme', inline._scheme).replace('email', inline._email).getRegex();
      inline._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;
      inline.tag = edit$1(inline.tag).replace('comment', inline._comment).replace('attribute', inline._attribute).getRegex();
      inline._label = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
      inline._href = /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/;
      inline._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;
      inline.link = edit$1(inline.link).replace('label', inline._label).replace('href', inline._href).replace('title', inline._title).getRegex();
      inline.reflink = edit$1(inline.reflink).replace('label', inline._label).getRegex();
      inline.reflinkSearch = edit$1(inline.reflinkSearch, 'g').replace('reflink', inline.reflink).replace('nolink', inline.nolink).getRegex();
      /**
       * Normal Inline Grammar
       */

      inline.normal = merge$1({}, inline);
      /**
       * Pedantic Inline Grammar
       */

      inline.pedantic = merge$1({}, inline.normal, {
        strong: {
          start: /^__|\*\*/,
          middle: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
          endAst: /\*\*(?!\*)/g,
          endUnd: /__(?!_)/g
        },
        em: {
          start: /^_|\*/,
          middle: /^()\*(?=\S)([\s\S]*?\S)\*(?!\*)|^_(?=\S)([\s\S]*?\S)_(?!_)/,
          endAst: /\*(?!\*)/g,
          endUnd: /_(?!_)/g
        },
        link: edit$1(/^!?\[(label)\]\((.*?)\)/).replace('label', inline._label).getRegex(),
        reflink: edit$1(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace('label', inline._label).getRegex()
      });
      /**
       * GFM Inline Grammar
       */

      inline.gfm = merge$1({}, inline.normal, {
        escape: edit$1(inline.escape).replace('])', '~|])').getRegex(),
        _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
        url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
        _backpedal: /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,
        del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,
        text: /^([`~]+|[^`~])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*~]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))/
      });
      inline.gfm.url = edit$1(inline.gfm.url, 'i').replace('email', inline.gfm._extended_email).getRegex();
      /**
       * GFM + Line Breaks Inline Grammar
       */

      inline.breaks = merge$1({}, inline.gfm, {
        br: edit$1(inline.br).replace('{2,}', '*').getRegex(),
        text: edit$1(inline.gfm.text).replace('\\b_', '\\b_| {2,}\\n').replace(/\{2,\}/g, '*').getRegex()
      });
      var rules = {
        block: block,
        inline: inline
      };

      var defaults$2 = defaults.defaults;
      var block$1 = rules.block,
          inline$1 = rules.inline;
      var repeatString$1 = helpers.repeatString;
      /**
       * smartypants text replacement
       */

      function smartypants(text) {
        return text // em-dashes
        .replace(/---/g, "\u2014") // en-dashes
        .replace(/--/g, "\u2013") // opening singles
        .replace(/(^|[-\u2014/(\[{"\s])'/g, "$1\u2018") // closing singles & apostrophes
        .replace(/'/g, "\u2019") // opening doubles
        .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, "$1\u201C") // closing doubles
        .replace(/"/g, "\u201D") // ellipses
        .replace(/\.{3}/g, "\u2026");
      }
      /**
       * mangle email addresses
       */


      function mangle(text) {
        var out = '',
            i,
            ch;
        var l = text.length;

        for (i = 0; i < l; i++) {
          ch = text.charCodeAt(i);

          if (Math.random() > 0.5) {
            ch = 'x' + ch.toString(16);
          }

          out += '&#' + ch + ';';
        }

        return out;
      }
      /**
       * Block Lexer
       */


      var Lexer_1 = /*#__PURE__*/function () {
        function Lexer(options) {
          this.tokens = [];
          this.tokens.links = Object.create(null);
          this.options = options || defaults$2;
          this.options.tokenizer = this.options.tokenizer || new Tokenizer_1();
          this.tokenizer = this.options.tokenizer;
          this.tokenizer.options = this.options;
          var rules = {
            block: block$1.normal,
            inline: inline$1.normal
          };

          if (this.options.pedantic) {
            rules.block = block$1.pedantic;
            rules.inline = inline$1.pedantic;
          } else if (this.options.gfm) {
            rules.block = block$1.gfm;

            if (this.options.breaks) {
              rules.inline = inline$1.breaks;
            } else {
              rules.inline = inline$1.gfm;
            }
          }

          this.tokenizer.rules = rules;
        }
        /**
         * Expose Rules
         */


        /**
         * Static Lex Method
         */
        Lexer.lex = function lex(src, options) {
          var lexer = new Lexer(options);
          return lexer.lex(src);
        }
        /**
         * Static Lex Inline Method
         */
        ;

        Lexer.lexInline = function lexInline(src, options) {
          var lexer = new Lexer(options);
          return lexer.inlineTokens(src);
        }
        /**
         * Preprocessing
         */
        ;

        var _proto = Lexer.prototype;

        _proto.lex = function lex(src) {
          src = src.replace(/\r\n|\r/g, '\n').replace(/\t/g, '    ');
          this.blockTokens(src, this.tokens, true);
          this.inline(this.tokens);
          return this.tokens;
        }
        /**
         * Lexing
         */
        ;

        _proto.blockTokens = function blockTokens(src, tokens, top) {
          if (tokens === void 0) {
            tokens = [];
          }

          if (top === void 0) {
            top = true;
          }

          if (this.options.pedantic) {
            src = src.replace(/^ +$/gm, '');
          }

          var token, i, l, lastToken;

          while (src) {
            // newline
            if (token = this.tokenizer.space(src)) {
              src = src.substring(token.raw.length);

              if (token.type) {
                tokens.push(token);
              }

              continue;
            } // code


            if (token = this.tokenizer.code(src, tokens)) {
              src = src.substring(token.raw.length);

              if (token.type) {
                tokens.push(token);
              } else {
                lastToken = tokens[tokens.length - 1];
                lastToken.raw += '\n' + token.raw;
                lastToken.text += '\n' + token.text;
              }

              continue;
            } // fences


            if (token = this.tokenizer.fences(src)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              continue;
            } // heading


            if (token = this.tokenizer.heading(src)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              continue;
            } // table no leading pipe (gfm)


            if (token = this.tokenizer.nptable(src)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              continue;
            } // hr


            if (token = this.tokenizer.hr(src)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              continue;
            } // blockquote


            if (token = this.tokenizer.blockquote(src)) {
              src = src.substring(token.raw.length);
              token.tokens = this.blockTokens(token.text, [], top);
              tokens.push(token);
              continue;
            } // list


            if (token = this.tokenizer.list(src)) {
              src = src.substring(token.raw.length);
              l = token.items.length;

              for (i = 0; i < l; i++) {
                token.items[i].tokens = this.blockTokens(token.items[i].text, [], false);
              }

              tokens.push(token);
              continue;
            } // html


            if (token = this.tokenizer.html(src)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              continue;
            } // def


            if (top && (token = this.tokenizer.def(src))) {
              src = src.substring(token.raw.length);

              if (!this.tokens.links[token.tag]) {
                this.tokens.links[token.tag] = {
                  href: token.href,
                  title: token.title
                };
              }

              continue;
            } // table (gfm)


            if (token = this.tokenizer.table(src)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              continue;
            } // lheading


            if (token = this.tokenizer.lheading(src)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              continue;
            } // top-level paragraph


            if (top && (token = this.tokenizer.paragraph(src))) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              continue;
            } // text


            if (token = this.tokenizer.text(src, tokens)) {
              src = src.substring(token.raw.length);

              if (token.type) {
                tokens.push(token);
              } else {
                lastToken = tokens[tokens.length - 1];
                lastToken.raw += '\n' + token.raw;
                lastToken.text += '\n' + token.text;
              }

              continue;
            }

            if (src) {
              var errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);

              if (this.options.silent) {
                console.error(errMsg);
                break;
              } else {
                throw new Error(errMsg);
              }
            }
          }

          return tokens;
        };

        _proto.inline = function inline(tokens) {
          var i, j, k, l2, row, token;
          var l = tokens.length;

          for (i = 0; i < l; i++) {
            token = tokens[i];

            switch (token.type) {
              case 'paragraph':
              case 'text':
              case 'heading':
                {
                  token.tokens = [];
                  this.inlineTokens(token.text, token.tokens);
                  break;
                }

              case 'table':
                {
                  token.tokens = {
                    header: [],
                    cells: []
                  }; // header

                  l2 = token.header.length;

                  for (j = 0; j < l2; j++) {
                    token.tokens.header[j] = [];
                    this.inlineTokens(token.header[j], token.tokens.header[j]);
                  } // cells


                  l2 = token.cells.length;

                  for (j = 0; j < l2; j++) {
                    row = token.cells[j];
                    token.tokens.cells[j] = [];

                    for (k = 0; k < row.length; k++) {
                      token.tokens.cells[j][k] = [];
                      this.inlineTokens(row[k], token.tokens.cells[j][k]);
                    }
                  }

                  break;
                }

              case 'blockquote':
                {
                  this.inline(token.tokens);
                  break;
                }

              case 'list':
                {
                  l2 = token.items.length;

                  for (j = 0; j < l2; j++) {
                    this.inline(token.items[j].tokens);
                  }

                  break;
                }
            }
          }

          return tokens;
        }
        /**
         * Lexing/Compiling
         */
        ;

        _proto.inlineTokens = function inlineTokens(src, tokens, inLink, inRawBlock) {
          if (tokens === void 0) {
            tokens = [];
          }

          if (inLink === void 0) {
            inLink = false;
          }

          if (inRawBlock === void 0) {
            inRawBlock = false;
          }

          var token; // String with links masked to avoid interference with em and strong

          var maskedSrc = src;
          var match;
          var keepPrevChar, prevChar; // Mask out reflinks

          if (this.tokens.links) {
            var links = Object.keys(this.tokens.links);

            if (links.length > 0) {
              while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
                if (links.includes(match[0].slice(match[0].lastIndexOf('[') + 1, -1))) {
                  maskedSrc = maskedSrc.slice(0, match.index) + '[' + repeatString$1('a', match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
                }
              }
            }
          } // Mask out other blocks


          while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
            maskedSrc = maskedSrc.slice(0, match.index) + '[' + repeatString$1('a', match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
          }

          while (src) {
            if (!keepPrevChar) {
              prevChar = '';
            }

            keepPrevChar = false; // escape

            if (token = this.tokenizer.escape(src)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              continue;
            } // tag


            if (token = this.tokenizer.tag(src, inLink, inRawBlock)) {
              src = src.substring(token.raw.length);
              inLink = token.inLink;
              inRawBlock = token.inRawBlock;
              tokens.push(token);
              continue;
            } // link


            if (token = this.tokenizer.link(src)) {
              src = src.substring(token.raw.length);

              if (token.type === 'link') {
                token.tokens = this.inlineTokens(token.text, [], true, inRawBlock);
              }

              tokens.push(token);
              continue;
            } // reflink, nolink


            if (token = this.tokenizer.reflink(src, this.tokens.links)) {
              src = src.substring(token.raw.length);

              if (token.type === 'link') {
                token.tokens = this.inlineTokens(token.text, [], true, inRawBlock);
              }

              tokens.push(token);
              continue;
            } // strong


            if (token = this.tokenizer.strong(src, maskedSrc, prevChar)) {
              src = src.substring(token.raw.length);
              token.tokens = this.inlineTokens(token.text, [], inLink, inRawBlock);
              tokens.push(token);
              continue;
            } // em


            if (token = this.tokenizer.em(src, maskedSrc, prevChar)) {
              src = src.substring(token.raw.length);
              token.tokens = this.inlineTokens(token.text, [], inLink, inRawBlock);
              tokens.push(token);
              continue;
            } // code


            if (token = this.tokenizer.codespan(src)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              continue;
            } // br


            if (token = this.tokenizer.br(src)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              continue;
            } // del (gfm)


            if (token = this.tokenizer.del(src)) {
              src = src.substring(token.raw.length);
              token.tokens = this.inlineTokens(token.text, [], inLink, inRawBlock);
              tokens.push(token);
              continue;
            } // autolink


            if (token = this.tokenizer.autolink(src, mangle)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              continue;
            } // url (gfm)


            if (!inLink && (token = this.tokenizer.url(src, mangle))) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              continue;
            } // text


            if (token = this.tokenizer.inlineText(src, inRawBlock, smartypants)) {
              src = src.substring(token.raw.length);
              prevChar = token.raw.slice(-1);
              keepPrevChar = true;
              tokens.push(token);
              continue;
            }

            if (src) {
              var errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);

              if (this.options.silent) {
                console.error(errMsg);
                break;
              } else {
                throw new Error(errMsg);
              }
            }
          }

          return tokens;
        };

        _createClass(Lexer, null, [{
          key: "rules",
          get: function get() {
            return {
              block: block$1,
              inline: inline$1
            };
          }
        }]);

        return Lexer;
      }();

      var defaults$3 = defaults.defaults;
      var cleanUrl$1 = helpers.cleanUrl,
          escape$1 = helpers.escape;
      /**
       * Renderer
       */

      var Renderer_1 = /*#__PURE__*/function () {
        function Renderer(options) {
          this.options = options || defaults$3;
        }

        var _proto = Renderer.prototype;

        _proto.code = function code(_code, infostring, escaped) {
          var lang = (infostring || '').match(/\S*/)[0];

          if (this.options.highlight) {
            var out = this.options.highlight(_code, lang);

            if (out != null && out !== _code) {
              escaped = true;
              _code = out;
            }
          }

          _code = _code.replace(/\n$/, '') + '\n';

          if (!lang) {
            return '<pre><code>' + (escaped ? _code : escape$1(_code, true)) + '</code></pre>\n';
          }

          return '<pre><code class="' + this.options.langPrefix + escape$1(lang, true) + '">' + (escaped ? _code : escape$1(_code, true)) + '</code></pre>\n';
        };

        _proto.blockquote = function blockquote(quote) {
          return '<blockquote>\n' + quote + '</blockquote>\n';
        };

        _proto.html = function html(_html) {
          return _html;
        };

        _proto.heading = function heading(text, level, raw, slugger) {
          if (this.options.headerIds) {
            return '<h' + level + ' id="' + this.options.headerPrefix + slugger.slug(raw) + '">' + text + '</h' + level + '>\n';
          } // ignore IDs


          return '<h' + level + '>' + text + '</h' + level + '>\n';
        };

        _proto.hr = function hr() {
          return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
        };

        _proto.list = function list(body, ordered, start) {
          var type = ordered ? 'ol' : 'ul',
              startatt = ordered && start !== 1 ? ' start="' + start + '"' : '';
          return '<' + type + startatt + '>\n' + body + '</' + type + '>\n';
        };

        _proto.listitem = function listitem(text) {
          return '<li>' + text + '</li>\n';
        };

        _proto.checkbox = function checkbox(checked) {
          return '<input ' + (checked ? 'checked="" ' : '') + 'disabled="" type="checkbox"' + (this.options.xhtml ? ' /' : '') + '> ';
        };

        _proto.paragraph = function paragraph(text) {
          return '<p>' + text + '</p>\n';
        };

        _proto.table = function table(header, body) {
          if (body) body = '<tbody>' + body + '</tbody>';
          return '<table>\n' + '<thead>\n' + header + '</thead>\n' + body + '</table>\n';
        };

        _proto.tablerow = function tablerow(content) {
          return '<tr>\n' + content + '</tr>\n';
        };

        _proto.tablecell = function tablecell(content, flags) {
          var type = flags.header ? 'th' : 'td';
          var tag = flags.align ? '<' + type + ' align="' + flags.align + '">' : '<' + type + '>';
          return tag + content + '</' + type + '>\n';
        } // span level renderer
        ;

        _proto.strong = function strong(text) {
          return '<strong>' + text + '</strong>';
        };

        _proto.em = function em(text) {
          return '<em>' + text + '</em>';
        };

        _proto.codespan = function codespan(text) {
          return '<code>' + text + '</code>';
        };

        _proto.br = function br() {
          return this.options.xhtml ? '<br/>' : '<br>';
        };

        _proto.del = function del(text) {
          return '<del>' + text + '</del>';
        };

        _proto.link = function link(href, title, text) {
          href = cleanUrl$1(this.options.sanitize, this.options.baseUrl, href);

          if (href === null) {
            return text;
          }

          var out = '<a href="' + escape$1(href) + '"';

          if (title) {
            out += ' title="' + title + '"';
          }

          out += '>' + text + '</a>';
          return out;
        };

        _proto.image = function image(href, title, text) {
          href = cleanUrl$1(this.options.sanitize, this.options.baseUrl, href);

          if (href === null) {
            return text;
          }

          var out = '<img src="' + href + '" alt="' + text + '"';

          if (title) {
            out += ' title="' + title + '"';
          }

          out += this.options.xhtml ? '/>' : '>';
          return out;
        };

        _proto.text = function text(_text) {
          return _text;
        };

        return Renderer;
      }();

      /**
       * TextRenderer
       * returns only the textual part of the token
       */
      var TextRenderer_1 = /*#__PURE__*/function () {
        function TextRenderer() {}

        var _proto = TextRenderer.prototype;

        // no need for block level renderers
        _proto.strong = function strong(text) {
          return text;
        };

        _proto.em = function em(text) {
          return text;
        };

        _proto.codespan = function codespan(text) {
          return text;
        };

        _proto.del = function del(text) {
          return text;
        };

        _proto.html = function html(text) {
          return text;
        };

        _proto.text = function text(_text) {
          return _text;
        };

        _proto.link = function link(href, title, text) {
          return '' + text;
        };

        _proto.image = function image(href, title, text) {
          return '' + text;
        };

        _proto.br = function br() {
          return '';
        };

        return TextRenderer;
      }();

      /**
       * Slugger generates header id
       */
      var Slugger_1 = /*#__PURE__*/function () {
        function Slugger() {
          this.seen = {};
        }

        var _proto = Slugger.prototype;

        _proto.serialize = function serialize(value) {
          return value.toLowerCase().trim() // remove html tags
          .replace(/<[!\/a-z].*?>/ig, '') // remove unwanted chars
          .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '').replace(/\s/g, '-');
        }
        /**
         * Finds the next safe (unique) slug to use
         */
        ;

        _proto.getNextSafeSlug = function getNextSafeSlug(originalSlug, isDryRun) {
          var slug = originalSlug;
          var occurenceAccumulator = 0;

          if (this.seen.hasOwnProperty(slug)) {
            occurenceAccumulator = this.seen[originalSlug];

            do {
              occurenceAccumulator++;
              slug = originalSlug + '-' + occurenceAccumulator;
            } while (this.seen.hasOwnProperty(slug));
          }

          if (!isDryRun) {
            this.seen[originalSlug] = occurenceAccumulator;
            this.seen[slug] = 0;
          }

          return slug;
        }
        /**
         * Convert string to unique id
         * @param {object} options
         * @param {boolean} options.dryrun Generates the next unique slug without updating the internal accumulator.
         */
        ;

        _proto.slug = function slug(value, options) {
          if (options === void 0) {
            options = {};
          }

          var slug = this.serialize(value);
          return this.getNextSafeSlug(slug, options.dryrun);
        };

        return Slugger;
      }();

      var defaults$4 = defaults.defaults;
      var unescape$1 = helpers.unescape;
      /**
       * Parsing & Compiling
       */

      var Parser_1 = /*#__PURE__*/function () {
        function Parser(options) {
          this.options = options || defaults$4;
          this.options.renderer = this.options.renderer || new Renderer_1();
          this.renderer = this.options.renderer;
          this.renderer.options = this.options;
          this.textRenderer = new TextRenderer_1();
          this.slugger = new Slugger_1();
        }
        /**
         * Static Parse Method
         */


        Parser.parse = function parse(tokens, options) {
          var parser = new Parser(options);
          return parser.parse(tokens);
        }
        /**
         * Static Parse Inline Method
         */
        ;

        Parser.parseInline = function parseInline(tokens, options) {
          var parser = new Parser(options);
          return parser.parseInline(tokens);
        }
        /**
         * Parse Loop
         */
        ;

        var _proto = Parser.prototype;

        _proto.parse = function parse(tokens, top) {
          if (top === void 0) {
            top = true;
          }

          var out = '',
              i,
              j,
              k,
              l2,
              l3,
              row,
              cell,
              header,
              body,
              token,
              ordered,
              start,
              loose,
              itemBody,
              item,
              checked,
              task,
              checkbox;
          var l = tokens.length;

          for (i = 0; i < l; i++) {
            token = tokens[i];

            switch (token.type) {
              case 'space':
                {
                  continue;
                }

              case 'hr':
                {
                  out += this.renderer.hr();
                  continue;
                }

              case 'heading':
                {
                  out += this.renderer.heading(this.parseInline(token.tokens), token.depth, unescape$1(this.parseInline(token.tokens, this.textRenderer)), this.slugger);
                  continue;
                }

              case 'code':
                {
                  out += this.renderer.code(token.text, token.lang, token.escaped);
                  continue;
                }

              case 'table':
                {
                  header = ''; // header

                  cell = '';
                  l2 = token.header.length;

                  for (j = 0; j < l2; j++) {
                    cell += this.renderer.tablecell(this.parseInline(token.tokens.header[j]), {
                      header: true,
                      align: token.align[j]
                    });
                  }

                  header += this.renderer.tablerow(cell);
                  body = '';
                  l2 = token.cells.length;

                  for (j = 0; j < l2; j++) {
                    row = token.tokens.cells[j];
                    cell = '';
                    l3 = row.length;

                    for (k = 0; k < l3; k++) {
                      cell += this.renderer.tablecell(this.parseInline(row[k]), {
                        header: false,
                        align: token.align[k]
                      });
                    }

                    body += this.renderer.tablerow(cell);
                  }

                  out += this.renderer.table(header, body);
                  continue;
                }

              case 'blockquote':
                {
                  body = this.parse(token.tokens);
                  out += this.renderer.blockquote(body);
                  continue;
                }

              case 'list':
                {
                  ordered = token.ordered;
                  start = token.start;
                  loose = token.loose;
                  l2 = token.items.length;
                  body = '';

                  for (j = 0; j < l2; j++) {
                    item = token.items[j];
                    checked = item.checked;
                    task = item.task;
                    itemBody = '';

                    if (item.task) {
                      checkbox = this.renderer.checkbox(checked);

                      if (loose) {
                        if (item.tokens.length > 0 && item.tokens[0].type === 'text') {
                          item.tokens[0].text = checkbox + ' ' + item.tokens[0].text;

                          if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === 'text') {
                            item.tokens[0].tokens[0].text = checkbox + ' ' + item.tokens[0].tokens[0].text;
                          }
                        } else {
                          item.tokens.unshift({
                            type: 'text',
                            text: checkbox
                          });
                        }
                      } else {
                        itemBody += checkbox;
                      }
                    }

                    itemBody += this.parse(item.tokens, loose);
                    body += this.renderer.listitem(itemBody, task, checked);
                  }

                  out += this.renderer.list(body, ordered, start);
                  continue;
                }

              case 'html':
                {
                  // TODO parse inline content if parameter markdown=1
                  out += this.renderer.html(token.text);
                  continue;
                }

              case 'paragraph':
                {
                  out += this.renderer.paragraph(this.parseInline(token.tokens));
                  continue;
                }

              case 'text':
                {
                  body = token.tokens ? this.parseInline(token.tokens) : token.text;

                  while (i + 1 < l && tokens[i + 1].type === 'text') {
                    token = tokens[++i];
                    body += '\n' + (token.tokens ? this.parseInline(token.tokens) : token.text);
                  }

                  out += top ? this.renderer.paragraph(body) : body;
                  continue;
                }

              default:
                {
                  var errMsg = 'Token with "' + token.type + '" type was not found.';

                  if (this.options.silent) {
                    console.error(errMsg);
                    return;
                  } else {
                    throw new Error(errMsg);
                  }
                }
            }
          }

          return out;
        }
        /**
         * Parse Inline Tokens
         */
        ;

        _proto.parseInline = function parseInline(tokens, renderer) {
          renderer = renderer || this.renderer;
          var out = '',
              i,
              token;
          var l = tokens.length;

          for (i = 0; i < l; i++) {
            token = tokens[i];

            switch (token.type) {
              case 'escape':
                {
                  out += renderer.text(token.text);
                  break;
                }

              case 'html':
                {
                  out += renderer.html(token.text);
                  break;
                }

              case 'link':
                {
                  out += renderer.link(token.href, token.title, this.parseInline(token.tokens, renderer));
                  break;
                }

              case 'image':
                {
                  out += renderer.image(token.href, token.title, token.text);
                  break;
                }

              case 'strong':
                {
                  out += renderer.strong(this.parseInline(token.tokens, renderer));
                  break;
                }

              case 'em':
                {
                  out += renderer.em(this.parseInline(token.tokens, renderer));
                  break;
                }

              case 'codespan':
                {
                  out += renderer.codespan(token.text);
                  break;
                }

              case 'br':
                {
                  out += renderer.br();
                  break;
                }

              case 'del':
                {
                  out += renderer.del(this.parseInline(token.tokens, renderer));
                  break;
                }

              case 'text':
                {
                  out += renderer.text(token.text);
                  break;
                }

              default:
                {
                  var errMsg = 'Token with "' + token.type + '" type was not found.';

                  if (this.options.silent) {
                    console.error(errMsg);
                    return;
                  } else {
                    throw new Error(errMsg);
                  }
                }
            }
          }

          return out;
        };

        return Parser;
      }();

      var merge$2 = helpers.merge,
          checkSanitizeDeprecation$1 = helpers.checkSanitizeDeprecation,
          escape$2 = helpers.escape;
      var getDefaults = defaults.getDefaults,
          changeDefaults = defaults.changeDefaults,
          defaults$5 = defaults.defaults;
      /**
       * Marked
       */

      function marked(src, opt, callback) {
        // throw error in case of non string input
        if (typeof src === 'undefined' || src === null) {
          throw new Error('marked(): input parameter is undefined or null');
        }

        if (typeof src !== 'string') {
          throw new Error('marked(): input parameter is of type ' + Object.prototype.toString.call(src) + ', string expected');
        }

        if (typeof opt === 'function') {
          callback = opt;
          opt = null;
        }

        opt = merge$2({}, marked.defaults, opt || {});
        checkSanitizeDeprecation$1(opt);

        if (callback) {
          var highlight = opt.highlight;
          var tokens;

          try {
            tokens = Lexer_1.lex(src, opt);
          } catch (e) {
            return callback(e);
          }

          var done = function done(err) {
            var out;

            if (!err) {
              try {
                out = Parser_1.parse(tokens, opt);
              } catch (e) {
                err = e;
              }
            }

            opt.highlight = highlight;
            return err ? callback(err) : callback(null, out);
          };

          if (!highlight || highlight.length < 3) {
            return done();
          }

          delete opt.highlight;
          if (!tokens.length) return done();
          var pending = 0;
          marked.walkTokens(tokens, function (token) {
            if (token.type === 'code') {
              pending++;
              setTimeout(function () {
                highlight(token.text, token.lang, function (err, code) {
                  if (err) {
                    return done(err);
                  }

                  if (code != null && code !== token.text) {
                    token.text = code;
                    token.escaped = true;
                  }

                  pending--;

                  if (pending === 0) {
                    done();
                  }
                });
              }, 0);
            }
          });

          if (pending === 0) {
            done();
          }

          return;
        }

        try {
          var _tokens = Lexer_1.lex(src, opt);

          if (opt.walkTokens) {
            marked.walkTokens(_tokens, opt.walkTokens);
          }

          return Parser_1.parse(_tokens, opt);
        } catch (e) {
          e.message += '\nPlease report this to https://github.com/markedjs/marked.';

          if (opt.silent) {
            return '<p>An error occurred:</p><pre>' + escape$2(e.message + '', true) + '</pre>';
          }

          throw e;
        }
      }
      /**
       * Options
       */


      marked.options = marked.setOptions = function (opt) {
        merge$2(marked.defaults, opt);
        changeDefaults(marked.defaults);
        return marked;
      };

      marked.getDefaults = getDefaults;
      marked.defaults = defaults$5;
      /**
       * Use Extension
       */

      marked.use = function (extension) {
        var opts = merge$2({}, extension);

        if (extension.renderer) {
          (function () {
            var renderer = marked.defaults.renderer || new Renderer_1();

            var _loop = function _loop(prop) {
              var prevRenderer = renderer[prop];

              renderer[prop] = function () {
                for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
                  args[_key] = arguments[_key];
                }

                var ret = extension.renderer[prop].apply(renderer, args);

                if (ret === false) {
                  ret = prevRenderer.apply(renderer, args);
                }

                return ret;
              };
            };

            for (var prop in extension.renderer) {
              _loop(prop);
            }

            opts.renderer = renderer;
          })();
        }

        if (extension.tokenizer) {
          (function () {
            var tokenizer = marked.defaults.tokenizer || new Tokenizer_1();

            var _loop2 = function _loop2(prop) {
              var prevTokenizer = tokenizer[prop];

              tokenizer[prop] = function () {
                for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                  args[_key2] = arguments[_key2];
                }

                var ret = extension.tokenizer[prop].apply(tokenizer, args);

                if (ret === false) {
                  ret = prevTokenizer.apply(tokenizer, args);
                }

                return ret;
              };
            };

            for (var prop in extension.tokenizer) {
              _loop2(prop);
            }

            opts.tokenizer = tokenizer;
          })();
        }

        if (extension.walkTokens) {
          var walkTokens = marked.defaults.walkTokens;

          opts.walkTokens = function (token) {
            extension.walkTokens(token);

            if (walkTokens) {
              walkTokens(token);
            }
          };
        }

        marked.setOptions(opts);
      };
      /**
       * Run callback for every token
       */


      marked.walkTokens = function (tokens, callback) {
        for (var _iterator = _createForOfIteratorHelperLoose(tokens), _step; !(_step = _iterator()).done;) {
          var token = _step.value;
          callback(token);

          switch (token.type) {
            case 'table':
              {
                for (var _iterator2 = _createForOfIteratorHelperLoose(token.tokens.header), _step2; !(_step2 = _iterator2()).done;) {
                  var cell = _step2.value;
                  marked.walkTokens(cell, callback);
                }

                for (var _iterator3 = _createForOfIteratorHelperLoose(token.tokens.cells), _step3; !(_step3 = _iterator3()).done;) {
                  var row = _step3.value;

                  for (var _iterator4 = _createForOfIteratorHelperLoose(row), _step4; !(_step4 = _iterator4()).done;) {
                    var _cell = _step4.value;
                    marked.walkTokens(_cell, callback);
                  }
                }

                break;
              }

            case 'list':
              {
                marked.walkTokens(token.items, callback);
                break;
              }

            default:
              {
                if (token.tokens) {
                  marked.walkTokens(token.tokens, callback);
                }
              }
          }
        }
      };
      /**
       * Parse Inline
       */


      marked.parseInline = function (src, opt) {
        // throw error in case of non string input
        if (typeof src === 'undefined' || src === null) {
          throw new Error('marked.parseInline(): input parameter is undefined or null');
        }

        if (typeof src !== 'string') {
          throw new Error('marked.parseInline(): input parameter is of type ' + Object.prototype.toString.call(src) + ', string expected');
        }

        opt = merge$2({}, marked.defaults, opt || {});
        checkSanitizeDeprecation$1(opt);

        try {
          var tokens = Lexer_1.lexInline(src, opt);

          if (opt.walkTokens) {
            marked.walkTokens(tokens, opt.walkTokens);
          }

          return Parser_1.parseInline(tokens, opt);
        } catch (e) {
          e.message += '\nPlease report this to https://github.com/markedjs/marked.';

          if (opt.silent) {
            return '<p>An error occurred:</p><pre>' + escape$2(e.message + '', true) + '</pre>';
          }

          throw e;
        }
      };
      /**
       * Expose
       */


      marked.Parser = Parser_1;
      marked.parser = Parser_1.parse;
      marked.Renderer = Renderer_1;
      marked.TextRenderer = TextRenderer_1;
      marked.Lexer = Lexer_1;
      marked.lexer = Lexer_1.lex;
      marked.Tokenizer = Tokenizer_1;
      marked.Slugger = Slugger_1;
      marked.parse = marked;
      var marked_1 = marked;

      return marked_1;

    })));
    });

    var purify = createCommonjsModule(function (module, exports) {
    /*! @license DOMPurify | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/2.2.2/LICENSE */

    (function (global, factory) {
       module.exports = factory() ;
    }(commonjsGlobal, function () {
      function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

      var hasOwnProperty = Object.hasOwnProperty,
          setPrototypeOf = Object.setPrototypeOf,
          isFrozen = Object.isFrozen,
          getPrototypeOf = Object.getPrototypeOf,
          getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
      var freeze = Object.freeze,
          seal = Object.seal,
          create = Object.create; // eslint-disable-line import/no-mutable-exports

      var _ref = typeof Reflect !== 'undefined' && Reflect,
          apply = _ref.apply,
          construct = _ref.construct;

      if (!apply) {
        apply = function apply(fun, thisValue, args) {
          return fun.apply(thisValue, args);
        };
      }

      if (!freeze) {
        freeze = function freeze(x) {
          return x;
        };
      }

      if (!seal) {
        seal = function seal(x) {
          return x;
        };
      }

      if (!construct) {
        construct = function construct(Func, args) {
          return new (Function.prototype.bind.apply(Func, [null].concat(_toConsumableArray(args))))();
        };
      }

      var arrayForEach = unapply(Array.prototype.forEach);
      var arrayPop = unapply(Array.prototype.pop);
      var arrayPush = unapply(Array.prototype.push);

      var stringToLowerCase = unapply(String.prototype.toLowerCase);
      var stringMatch = unapply(String.prototype.match);
      var stringReplace = unapply(String.prototype.replace);
      var stringIndexOf = unapply(String.prototype.indexOf);
      var stringTrim = unapply(String.prototype.trim);

      var regExpTest = unapply(RegExp.prototype.test);

      var typeErrorCreate = unconstruct(TypeError);

      function unapply(func) {
        return function (thisArg) {
          for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }

          return apply(func, thisArg, args);
        };
      }

      function unconstruct(func) {
        return function () {
          for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
          }

          return construct(func, args);
        };
      }

      /* Add properties to a lookup table */
      function addToSet(set, array) {
        if (setPrototypeOf) {
          // Make 'in' and truthy checks like Boolean(set.constructor)
          // independent of any properties defined on Object.prototype.
          // Prevent prototype setters from intercepting set as a this value.
          setPrototypeOf(set, null);
        }

        var l = array.length;
        while (l--) {
          var element = array[l];
          if (typeof element === 'string') {
            var lcElement = stringToLowerCase(element);
            if (lcElement !== element) {
              // Config presets (e.g. tags.js, attrs.js) are immutable.
              if (!isFrozen(array)) {
                array[l] = lcElement;
              }

              element = lcElement;
            }
          }

          set[element] = true;
        }

        return set;
      }

      /* Shallow clone an object */
      function clone(object) {
        var newObject = create(null);

        var property = void 0;
        for (property in object) {
          if (apply(hasOwnProperty, object, [property])) {
            newObject[property] = object[property];
          }
        }

        return newObject;
      }

      /* IE10 doesn't support __lookupGetter__ so lets'
       * simulate it. It also automatically checks
       * if the prop is function or getter and behaves
       * accordingly. */
      function lookupGetter(object, prop) {
        while (object !== null) {
          var desc = getOwnPropertyDescriptor(object, prop);
          if (desc) {
            if (desc.get) {
              return unapply(desc.get);
            }

            if (typeof desc.value === 'function') {
              return unapply(desc.value);
            }
          }

          object = getPrototypeOf(object);
        }

        function fallbackValue(element) {
          console.warn('fallback value for', element);
          return null;
        }

        return fallbackValue;
      }

      var html = freeze(['a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo', 'big', 'blink', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'content', 'data', 'datalist', 'dd', 'decorator', 'del', 'details', 'dfn', 'dialog', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meter', 'nav', 'nobr', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'section', 'select', 'shadow', 'small', 'source', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt', 'u', 'ul', 'var', 'video', 'wbr']);

      // SVG
      var svg = freeze(['svg', 'a', 'altglyph', 'altglyphdef', 'altglyphitem', 'animatecolor', 'animatemotion', 'animatetransform', 'circle', 'clippath', 'defs', 'desc', 'ellipse', 'filter', 'font', 'g', 'glyph', 'glyphref', 'hkern', 'image', 'line', 'lineargradient', 'marker', 'mask', 'metadata', 'mpath', 'path', 'pattern', 'polygon', 'polyline', 'radialgradient', 'rect', 'stop', 'style', 'switch', 'symbol', 'text', 'textpath', 'title', 'tref', 'tspan', 'view', 'vkern']);

      var svgFilters = freeze(['feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence']);

      // List of SVG elements that are disallowed by default.
      // We still need to know them so that we can do namespace
      // checks properly in case one wants to add them to
      // allow-list.
      var svgDisallowed = freeze(['animate', 'color-profile', 'cursor', 'discard', 'fedropshadow', 'feimage', 'font-face', 'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri', 'foreignobject', 'hatch', 'hatchpath', 'mesh', 'meshgradient', 'meshpatch', 'meshrow', 'missing-glyph', 'script', 'set', 'solidcolor', 'unknown', 'use']);

      var mathMl = freeze(['math', 'menclose', 'merror', 'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot', 'mrow', 'ms', 'mspace', 'msqrt', 'mstyle', 'msub', 'msup', 'msubsup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover']);

      // Similarly to SVG, we want to know all MathML elements,
      // even those that we disallow by default.
      var mathMlDisallowed = freeze(['maction', 'maligngroup', 'malignmark', 'mlongdiv', 'mscarries', 'mscarry', 'msgroup', 'mstack', 'msline', 'msrow', 'semantics', 'annotation', 'annotation-xml', 'mprescripts', 'none']);

      var text = freeze(['#text']);

      var html$1 = freeze(['accept', 'action', 'align', 'alt', 'autocapitalize', 'autocomplete', 'autopictureinpicture', 'autoplay', 'background', 'bgcolor', 'border', 'capture', 'cellpadding', 'cellspacing', 'checked', 'cite', 'class', 'clear', 'color', 'cols', 'colspan', 'controls', 'controlslist', 'coords', 'crossorigin', 'datetime', 'decoding', 'default', 'dir', 'disabled', 'disablepictureinpicture', 'disableremoteplayback', 'download', 'draggable', 'enctype', 'enterkeyhint', 'face', 'for', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'id', 'inputmode', 'integrity', 'ismap', 'kind', 'label', 'lang', 'list', 'loading', 'loop', 'low', 'max', 'maxlength', 'media', 'method', 'min', 'minlength', 'multiple', 'muted', 'name', 'noshade', 'novalidate', 'nowrap', 'open', 'optimum', 'pattern', 'placeholder', 'playsinline', 'poster', 'preload', 'pubdate', 'radiogroup', 'readonly', 'rel', 'required', 'rev', 'reversed', 'role', 'rows', 'rowspan', 'spellcheck', 'scope', 'selected', 'shape', 'size', 'sizes', 'span', 'srclang', 'start', 'src', 'srcset', 'step', 'style', 'summary', 'tabindex', 'title', 'translate', 'type', 'usemap', 'valign', 'value', 'width', 'xmlns']);

      var svg$1 = freeze(['accent-height', 'accumulate', 'additive', 'alignment-baseline', 'ascent', 'attributename', 'attributetype', 'azimuth', 'basefrequency', 'baseline-shift', 'begin', 'bias', 'by', 'class', 'clip', 'clippathunits', 'clip-path', 'clip-rule', 'color', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'cx', 'cy', 'd', 'dx', 'dy', 'diffuseconstant', 'direction', 'display', 'divisor', 'dur', 'edgemode', 'elevation', 'end', 'fill', 'fill-opacity', 'fill-rule', 'filter', 'filterunits', 'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'fx', 'fy', 'g1', 'g2', 'glyph-name', 'glyphref', 'gradientunits', 'gradienttransform', 'height', 'href', 'id', 'image-rendering', 'in', 'in2', 'k', 'k1', 'k2', 'k3', 'k4', 'kerning', 'keypoints', 'keysplines', 'keytimes', 'lang', 'lengthadjust', 'letter-spacing', 'kernelmatrix', 'kernelunitlength', 'lighting-color', 'local', 'marker-end', 'marker-mid', 'marker-start', 'markerheight', 'markerunits', 'markerwidth', 'maskcontentunits', 'maskunits', 'max', 'mask', 'media', 'method', 'mode', 'min', 'name', 'numoctaves', 'offset', 'operator', 'opacity', 'order', 'orient', 'orientation', 'origin', 'overflow', 'paint-order', 'path', 'pathlength', 'patterncontentunits', 'patterntransform', 'patternunits', 'points', 'preservealpha', 'preserveaspectratio', 'primitiveunits', 'r', 'rx', 'ry', 'radius', 'refx', 'refy', 'repeatcount', 'repeatdur', 'restart', 'result', 'rotate', 'scale', 'seed', 'shape-rendering', 'specularconstant', 'specularexponent', 'spreadmethod', 'startoffset', 'stddeviation', 'stitchtiles', 'stop-color', 'stop-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke', 'stroke-width', 'style', 'surfacescale', 'systemlanguage', 'tabindex', 'targetx', 'targety', 'transform', 'text-anchor', 'text-decoration', 'text-rendering', 'textlength', 'type', 'u1', 'u2', 'unicode', 'values', 'viewbox', 'visibility', 'version', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'width', 'word-spacing', 'wrap', 'writing-mode', 'xchannelselector', 'ychannelselector', 'x', 'x1', 'x2', 'xmlns', 'y', 'y1', 'y2', 'z', 'zoomandpan']);

      var mathMl$1 = freeze(['accent', 'accentunder', 'align', 'bevelled', 'close', 'columnsalign', 'columnlines', 'columnspan', 'denomalign', 'depth', 'dir', 'display', 'displaystyle', 'encoding', 'fence', 'frame', 'height', 'href', 'id', 'largeop', 'length', 'linethickness', 'lspace', 'lquote', 'mathbackground', 'mathcolor', 'mathsize', 'mathvariant', 'maxsize', 'minsize', 'movablelimits', 'notation', 'numalign', 'open', 'rowalign', 'rowlines', 'rowspacing', 'rowspan', 'rspace', 'rquote', 'scriptlevel', 'scriptminsize', 'scriptsizemultiplier', 'selection', 'separator', 'separators', 'stretchy', 'subscriptshift', 'supscriptshift', 'symmetric', 'voffset', 'width', 'xmlns']);

      var xml = freeze(['xlink:href', 'xml:id', 'xlink:title', 'xml:space', 'xmlns:xlink']);

      // eslint-disable-next-line unicorn/better-regex
      var MUSTACHE_EXPR = seal(/\{\{[\s\S]*|[\s\S]*\}\}/gm); // Specify template detection regex for SAFE_FOR_TEMPLATES mode
      var ERB_EXPR = seal(/<%[\s\S]*|[\s\S]*%>/gm);
      var DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]/); // eslint-disable-line no-useless-escape
      var ARIA_ATTR = seal(/^aria-[\-\w]+$/); // eslint-disable-line no-useless-escape
      var IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i // eslint-disable-line no-useless-escape
      );
      var IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
      var ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g // eslint-disable-line no-control-regex
      );

      var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

      function _toConsumableArray$1(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

      var getGlobal = function getGlobal() {
        return typeof window === 'undefined' ? null : window;
      };

      /**
       * Creates a no-op policy for internal use only.
       * Don't export this function outside this module!
       * @param {?TrustedTypePolicyFactory} trustedTypes The policy factory.
       * @param {Document} document The document object (to determine policy name suffix)
       * @return {?TrustedTypePolicy} The policy created (or null, if Trusted Types
       * are not supported).
       */
      var _createTrustedTypesPolicy = function _createTrustedTypesPolicy(trustedTypes, document) {
        if ((typeof trustedTypes === 'undefined' ? 'undefined' : _typeof(trustedTypes)) !== 'object' || typeof trustedTypes.createPolicy !== 'function') {
          return null;
        }

        // Allow the callers to control the unique policy name
        // by adding a data-tt-policy-suffix to the script element with the DOMPurify.
        // Policy creation with duplicate names throws in Trusted Types.
        var suffix = null;
        var ATTR_NAME = 'data-tt-policy-suffix';
        if (document.currentScript && document.currentScript.hasAttribute(ATTR_NAME)) {
          suffix = document.currentScript.getAttribute(ATTR_NAME);
        }

        var policyName = 'dompurify' + (suffix ? '#' + suffix : '');

        try {
          return trustedTypes.createPolicy(policyName, {
            createHTML: function createHTML(html$$1) {
              return html$$1;
            }
          });
        } catch (_) {
          // Policy creation failed (most likely another DOMPurify script has
          // already run). Skip creating the policy, as this will only cause errors
          // if TT are enforced.
          console.warn('TrustedTypes policy ' + policyName + ' could not be created.');
          return null;
        }
      };

      function createDOMPurify() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getGlobal();

        var DOMPurify = function DOMPurify(root) {
          return createDOMPurify(root);
        };

        /**
         * Version label, exposed for easier checks
         * if DOMPurify is up to date or not
         */
        DOMPurify.version = '2.2.7';

        /**
         * Array of elements that DOMPurify removed during sanitation.
         * Empty if nothing was removed.
         */
        DOMPurify.removed = [];

        if (!window || !window.document || window.document.nodeType !== 9) {
          // Not running in a browser, provide a factory function
          // so that you can pass your own Window
          DOMPurify.isSupported = false;

          return DOMPurify;
        }

        var originalDocument = window.document;

        var document = window.document;
        var DocumentFragment = window.DocumentFragment,
            HTMLTemplateElement = window.HTMLTemplateElement,
            Node = window.Node,
            Element = window.Element,
            NodeFilter = window.NodeFilter,
            _window$NamedNodeMap = window.NamedNodeMap,
            NamedNodeMap = _window$NamedNodeMap === undefined ? window.NamedNodeMap || window.MozNamedAttrMap : _window$NamedNodeMap,
            Text = window.Text,
            Comment = window.Comment,
            DOMParser = window.DOMParser,
            trustedTypes = window.trustedTypes;


        var ElementPrototype = Element.prototype;

        var cloneNode = lookupGetter(ElementPrototype, 'cloneNode');
        var getNextSibling = lookupGetter(ElementPrototype, 'nextSibling');
        var getChildNodes = lookupGetter(ElementPrototype, 'childNodes');
        var getParentNode = lookupGetter(ElementPrototype, 'parentNode');

        // As per issue #47, the web-components registry is inherited by a
        // new document created via createHTMLDocument. As per the spec
        // (http://w3c.github.io/webcomponents/spec/custom/#creating-and-passing-registries)
        // a new empty registry is used when creating a template contents owner
        // document, so we use that as our parent document to ensure nothing
        // is inherited.
        if (typeof HTMLTemplateElement === 'function') {
          var template = document.createElement('template');
          if (template.content && template.content.ownerDocument) {
            document = template.content.ownerDocument;
          }
        }

        var trustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, originalDocument);
        var emptyHTML = trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML('') : '';

        var _document = document,
            implementation = _document.implementation,
            createNodeIterator = _document.createNodeIterator,
            getElementsByTagName = _document.getElementsByTagName,
            createDocumentFragment = _document.createDocumentFragment;
        var importNode = originalDocument.importNode;


        var documentMode = {};
        try {
          documentMode = clone(document).documentMode ? document.documentMode : {};
        } catch (_) {}

        var hooks = {};

        /**
         * Expose whether this browser supports running the full DOMPurify.
         */
        DOMPurify.isSupported = typeof getParentNode === 'function' && implementation && typeof implementation.createHTMLDocument !== 'undefined' && documentMode !== 9;

        var MUSTACHE_EXPR$$1 = MUSTACHE_EXPR,
            ERB_EXPR$$1 = ERB_EXPR,
            DATA_ATTR$$1 = DATA_ATTR,
            ARIA_ATTR$$1 = ARIA_ATTR,
            IS_SCRIPT_OR_DATA$$1 = IS_SCRIPT_OR_DATA,
            ATTR_WHITESPACE$$1 = ATTR_WHITESPACE;
        var IS_ALLOWED_URI$$1 = IS_ALLOWED_URI;

        /**
         * We consider the elements and attributes below to be safe. Ideally
         * don't add any new ones but feel free to remove unwanted ones.
         */

        /* allowed element names */

        var ALLOWED_TAGS = null;
        var DEFAULT_ALLOWED_TAGS = addToSet({}, [].concat(_toConsumableArray$1(html), _toConsumableArray$1(svg), _toConsumableArray$1(svgFilters), _toConsumableArray$1(mathMl), _toConsumableArray$1(text)));

        /* Allowed attribute names */
        var ALLOWED_ATTR = null;
        var DEFAULT_ALLOWED_ATTR = addToSet({}, [].concat(_toConsumableArray$1(html$1), _toConsumableArray$1(svg$1), _toConsumableArray$1(mathMl$1), _toConsumableArray$1(xml)));

        /* Explicitly forbidden tags (overrides ALLOWED_TAGS/ADD_TAGS) */
        var FORBID_TAGS = null;

        /* Explicitly forbidden attributes (overrides ALLOWED_ATTR/ADD_ATTR) */
        var FORBID_ATTR = null;

        /* Decide if ARIA attributes are okay */
        var ALLOW_ARIA_ATTR = true;

        /* Decide if custom data attributes are okay */
        var ALLOW_DATA_ATTR = true;

        /* Decide if unknown protocols are okay */
        var ALLOW_UNKNOWN_PROTOCOLS = false;

        /* Output should be safe for common template engines.
         * This means, DOMPurify removes data attributes, mustaches and ERB
         */
        var SAFE_FOR_TEMPLATES = false;

        /* Decide if document with <html>... should be returned */
        var WHOLE_DOCUMENT = false;

        /* Track whether config is already set on this instance of DOMPurify. */
        var SET_CONFIG = false;

        /* Decide if all elements (e.g. style, script) must be children of
         * document.body. By default, browsers might move them to document.head */
        var FORCE_BODY = false;

        /* Decide if a DOM `HTMLBodyElement` should be returned, instead of a html
         * string (or a TrustedHTML object if Trusted Types are supported).
         * If `WHOLE_DOCUMENT` is enabled a `HTMLHtmlElement` will be returned instead
         */
        var RETURN_DOM = false;

        /* Decide if a DOM `DocumentFragment` should be returned, instead of a html
         * string  (or a TrustedHTML object if Trusted Types are supported) */
        var RETURN_DOM_FRAGMENT = false;

        /* If `RETURN_DOM` or `RETURN_DOM_FRAGMENT` is enabled, decide if the returned DOM
         * `Node` is imported into the current `Document`. If this flag is not enabled the
         * `Node` will belong (its ownerDocument) to a fresh `HTMLDocument`, created by
         * DOMPurify.
         *
         * This defaults to `true` starting DOMPurify 2.2.0. Note that setting it to `false`
         * might cause XSS from attacks hidden in closed shadowroots in case the browser
         * supports Declarative Shadow: DOM https://web.dev/declarative-shadow-dom/
         */
        var RETURN_DOM_IMPORT = true;

        /* Try to return a Trusted Type object instead of a string, return a string in
         * case Trusted Types are not supported  */
        var RETURN_TRUSTED_TYPE = false;

        /* Output should be free from DOM clobbering attacks? */
        var SANITIZE_DOM = true;

        /* Keep element content when removing element? */
        var KEEP_CONTENT = true;

        /* If a `Node` is passed to sanitize(), then performs sanitization in-place instead
         * of importing it into a new Document and returning a sanitized copy */
        var IN_PLACE = false;

        /* Allow usage of profiles like html, svg and mathMl */
        var USE_PROFILES = {};

        /* Tags to ignore content of when KEEP_CONTENT is true */
        var FORBID_CONTENTS = addToSet({}, ['annotation-xml', 'audio', 'colgroup', 'desc', 'foreignobject', 'head', 'iframe', 'math', 'mi', 'mn', 'mo', 'ms', 'mtext', 'noembed', 'noframes', 'noscript', 'plaintext', 'script', 'style', 'svg', 'template', 'thead', 'title', 'video', 'xmp']);

        /* Tags that are safe for data: URIs */
        var DATA_URI_TAGS = null;
        var DEFAULT_DATA_URI_TAGS = addToSet({}, ['audio', 'video', 'img', 'source', 'image', 'track']);

        /* Attributes safe for values like "javascript:" */
        var URI_SAFE_ATTRIBUTES = null;
        var DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, ['alt', 'class', 'for', 'id', 'label', 'name', 'pattern', 'placeholder', 'summary', 'title', 'value', 'style', 'xmlns']);

        /* Keep a reference to config to pass to hooks */
        var CONFIG = null;

        /* Ideally, do not touch anything below this line */
        /* ______________________________________________ */

        var formElement = document.createElement('form');

        /**
         * _parseConfig
         *
         * @param  {Object} cfg optional config literal
         */
        // eslint-disable-next-line complexity
        var _parseConfig = function _parseConfig(cfg) {
          if (CONFIG && CONFIG === cfg) {
            return;
          }

          /* Shield configuration object from tampering */
          if (!cfg || (typeof cfg === 'undefined' ? 'undefined' : _typeof(cfg)) !== 'object') {
            cfg = {};
          }

          /* Shield configuration object from prototype pollution */
          cfg = clone(cfg);

          /* Set configuration parameters */
          ALLOWED_TAGS = 'ALLOWED_TAGS' in cfg ? addToSet({}, cfg.ALLOWED_TAGS) : DEFAULT_ALLOWED_TAGS;
          ALLOWED_ATTR = 'ALLOWED_ATTR' in cfg ? addToSet({}, cfg.ALLOWED_ATTR) : DEFAULT_ALLOWED_ATTR;
          URI_SAFE_ATTRIBUTES = 'ADD_URI_SAFE_ATTR' in cfg ? addToSet(clone(DEFAULT_URI_SAFE_ATTRIBUTES), cfg.ADD_URI_SAFE_ATTR) : DEFAULT_URI_SAFE_ATTRIBUTES;
          DATA_URI_TAGS = 'ADD_DATA_URI_TAGS' in cfg ? addToSet(clone(DEFAULT_DATA_URI_TAGS), cfg.ADD_DATA_URI_TAGS) : DEFAULT_DATA_URI_TAGS;
          FORBID_TAGS = 'FORBID_TAGS' in cfg ? addToSet({}, cfg.FORBID_TAGS) : {};
          FORBID_ATTR = 'FORBID_ATTR' in cfg ? addToSet({}, cfg.FORBID_ATTR) : {};
          USE_PROFILES = 'USE_PROFILES' in cfg ? cfg.USE_PROFILES : false;
          ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false; // Default true
          ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false; // Default true
          ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false; // Default false
          SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false; // Default false
          WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false; // Default false
          RETURN_DOM = cfg.RETURN_DOM || false; // Default false
          RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false; // Default false
          RETURN_DOM_IMPORT = cfg.RETURN_DOM_IMPORT !== false; // Default true
          RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false; // Default false
          FORCE_BODY = cfg.FORCE_BODY || false; // Default false
          SANITIZE_DOM = cfg.SANITIZE_DOM !== false; // Default true
          KEEP_CONTENT = cfg.KEEP_CONTENT !== false; // Default true
          IN_PLACE = cfg.IN_PLACE || false; // Default false
          IS_ALLOWED_URI$$1 = cfg.ALLOWED_URI_REGEXP || IS_ALLOWED_URI$$1;
          if (SAFE_FOR_TEMPLATES) {
            ALLOW_DATA_ATTR = false;
          }

          if (RETURN_DOM_FRAGMENT) {
            RETURN_DOM = true;
          }

          /* Parse profile info */
          if (USE_PROFILES) {
            ALLOWED_TAGS = addToSet({}, [].concat(_toConsumableArray$1(text)));
            ALLOWED_ATTR = [];
            if (USE_PROFILES.html === true) {
              addToSet(ALLOWED_TAGS, html);
              addToSet(ALLOWED_ATTR, html$1);
            }

            if (USE_PROFILES.svg === true) {
              addToSet(ALLOWED_TAGS, svg);
              addToSet(ALLOWED_ATTR, svg$1);
              addToSet(ALLOWED_ATTR, xml);
            }

            if (USE_PROFILES.svgFilters === true) {
              addToSet(ALLOWED_TAGS, svgFilters);
              addToSet(ALLOWED_ATTR, svg$1);
              addToSet(ALLOWED_ATTR, xml);
            }

            if (USE_PROFILES.mathMl === true) {
              addToSet(ALLOWED_TAGS, mathMl);
              addToSet(ALLOWED_ATTR, mathMl$1);
              addToSet(ALLOWED_ATTR, xml);
            }
          }

          /* Merge configuration parameters */
          if (cfg.ADD_TAGS) {
            if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) {
              ALLOWED_TAGS = clone(ALLOWED_TAGS);
            }

            addToSet(ALLOWED_TAGS, cfg.ADD_TAGS);
          }

          if (cfg.ADD_ATTR) {
            if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) {
              ALLOWED_ATTR = clone(ALLOWED_ATTR);
            }

            addToSet(ALLOWED_ATTR, cfg.ADD_ATTR);
          }

          if (cfg.ADD_URI_SAFE_ATTR) {
            addToSet(URI_SAFE_ATTRIBUTES, cfg.ADD_URI_SAFE_ATTR);
          }

          /* Add #text in case KEEP_CONTENT is set to true */
          if (KEEP_CONTENT) {
            ALLOWED_TAGS['#text'] = true;
          }

          /* Add html, head and body to ALLOWED_TAGS in case WHOLE_DOCUMENT is true */
          if (WHOLE_DOCUMENT) {
            addToSet(ALLOWED_TAGS, ['html', 'head', 'body']);
          }

          /* Add tbody to ALLOWED_TAGS in case tables are permitted, see #286, #365 */
          if (ALLOWED_TAGS.table) {
            addToSet(ALLOWED_TAGS, ['tbody']);
            delete FORBID_TAGS.tbody;
          }

          // Prevent further manipulation of configuration.
          // Not available in IE8, Safari 5, etc.
          if (freeze) {
            freeze(cfg);
          }

          CONFIG = cfg;
        };

        var MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, ['mi', 'mo', 'mn', 'ms', 'mtext']);

        var HTML_INTEGRATION_POINTS = addToSet({}, ['foreignobject', 'desc', 'title', 'annotation-xml']);

        /* Keep track of all possible SVG and MathML tags
         * so that we can perform the namespace checks
         * correctly. */
        var ALL_SVG_TAGS = addToSet({}, svg);
        addToSet(ALL_SVG_TAGS, svgFilters);
        addToSet(ALL_SVG_TAGS, svgDisallowed);

        var ALL_MATHML_TAGS = addToSet({}, mathMl);
        addToSet(ALL_MATHML_TAGS, mathMlDisallowed);

        var MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
        var SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
        var HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

        /**
         *
         *
         * @param  {Element} element a DOM element whose namespace is being checked
         * @returns {boolean} Return false if the element has a
         *  namespace that a spec-compliant parser would never
         *  return. Return true otherwise.
         */
        var _checkValidNamespace = function _checkValidNamespace(element) {
          var parent = getParentNode(element);

          // In JSDOM, if we're inside shadow DOM, then parentNode
          // can be null. We just simulate parent in this case.
          if (!parent || !parent.tagName) {
            parent = {
              namespaceURI: HTML_NAMESPACE,
              tagName: 'template'
            };
          }

          var tagName = stringToLowerCase(element.tagName);
          var parentTagName = stringToLowerCase(parent.tagName);

          if (element.namespaceURI === SVG_NAMESPACE) {
            // The only way to switch from HTML namespace to SVG
            // is via <svg>. If it happens via any other tag, then
            // it should be killed.
            if (parent.namespaceURI === HTML_NAMESPACE) {
              return tagName === 'svg';
            }

            // The only way to switch from MathML to SVG is via
            // svg if parent is either <annotation-xml> or MathML
            // text integration points.
            if (parent.namespaceURI === MATHML_NAMESPACE) {
              return tagName === 'svg' && (parentTagName === 'annotation-xml' || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
            }

            // We only allow elements that are defined in SVG
            // spec. All others are disallowed in SVG namespace.
            return Boolean(ALL_SVG_TAGS[tagName]);
          }

          if (element.namespaceURI === MATHML_NAMESPACE) {
            // The only way to switch from HTML namespace to MathML
            // is via <math>. If it happens via any other tag, then
            // it should be killed.
            if (parent.namespaceURI === HTML_NAMESPACE) {
              return tagName === 'math';
            }

            // The only way to switch from SVG to MathML is via
            // <math> and HTML integration points
            if (parent.namespaceURI === SVG_NAMESPACE) {
              return tagName === 'math' && HTML_INTEGRATION_POINTS[parentTagName];
            }

            // We only allow elements that are defined in MathML
            // spec. All others are disallowed in MathML namespace.
            return Boolean(ALL_MATHML_TAGS[tagName]);
          }

          if (element.namespaceURI === HTML_NAMESPACE) {
            // The only way to switch from SVG to HTML is via
            // HTML integration points, and from MathML to HTML
            // is via MathML text integration points
            if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) {
              return false;
            }

            if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) {
              return false;
            }

            // Certain elements are allowed in both SVG and HTML
            // namespace. We need to specify them explicitly
            // so that they don't get erronously deleted from
            // HTML namespace.
            var commonSvgAndHTMLElements = addToSet({}, ['title', 'style', 'font', 'a', 'script']);

            // We disallow tags that are specific for MathML
            // or SVG and should never appear in HTML namespace
            return !ALL_MATHML_TAGS[tagName] && (commonSvgAndHTMLElements[tagName] || !ALL_SVG_TAGS[tagName]);
          }

          // The code should never reach this place (this means
          // that the element somehow got namespace that is not
          // HTML, SVG or MathML). Return false just in case.
          return false;
        };

        /**
         * _forceRemove
         *
         * @param  {Node} node a DOM node
         */
        var _forceRemove = function _forceRemove(node) {
          arrayPush(DOMPurify.removed, { element: node });
          try {
            node.parentNode.removeChild(node);
          } catch (_) {
            try {
              node.outerHTML = emptyHTML;
            } catch (_) {
              node.remove();
            }
          }
        };

        /**
         * _removeAttribute
         *
         * @param  {String} name an Attribute name
         * @param  {Node} node a DOM node
         */
        var _removeAttribute = function _removeAttribute(name, node) {
          try {
            arrayPush(DOMPurify.removed, {
              attribute: node.getAttributeNode(name),
              from: node
            });
          } catch (_) {
            arrayPush(DOMPurify.removed, {
              attribute: null,
              from: node
            });
          }

          node.removeAttribute(name);

          // We void attribute values for unremovable "is"" attributes
          if (name === 'is' && !ALLOWED_ATTR[name]) {
            if (RETURN_DOM || RETURN_DOM_FRAGMENT) {
              try {
                _forceRemove(node);
              } catch (_) {}
            } else {
              try {
                node.setAttribute(name, '');
              } catch (_) {}
            }
          }
        };

        /**
         * _initDocument
         *
         * @param  {String} dirty a string of dirty markup
         * @return {Document} a DOM, filled with the dirty markup
         */
        var _initDocument = function _initDocument(dirty) {
          /* Create a HTML document */
          var doc = void 0;
          var leadingWhitespace = void 0;

          if (FORCE_BODY) {
            dirty = '<remove></remove>' + dirty;
          } else {
            /* If FORCE_BODY isn't used, leading whitespace needs to be preserved manually */
            var matches = stringMatch(dirty, /^[\r\n\t ]+/);
            leadingWhitespace = matches && matches[0];
          }

          var dirtyPayload = trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
          /* Use the DOMParser API by default, fallback later if needs be */
          try {
            doc = new DOMParser().parseFromString(dirtyPayload, 'text/html');
          } catch (_) {}

          /* Use createHTMLDocument in case DOMParser is not available */
          if (!doc || !doc.documentElement) {
            doc = implementation.createHTMLDocument('');
            var _doc = doc,
                body = _doc.body;

            body.parentNode.removeChild(body.parentNode.firstElementChild);
            body.outerHTML = dirtyPayload;
          }

          if (dirty && leadingWhitespace) {
            doc.body.insertBefore(document.createTextNode(leadingWhitespace), doc.body.childNodes[0] || null);
          }

          /* Work on whole document or just its body */
          return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? 'html' : 'body')[0];
        };

        /**
         * _createIterator
         *
         * @param  {Document} root document/fragment to create iterator for
         * @return {Iterator} iterator instance
         */
        var _createIterator = function _createIterator(root) {
          return createNodeIterator.call(root.ownerDocument || root, root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT, function () {
            return NodeFilter.FILTER_ACCEPT;
          }, false);
        };

        /**
         * _isClobbered
         *
         * @param  {Node} elm element to check for clobbering attacks
         * @return {Boolean} true if clobbered, false if safe
         */
        var _isClobbered = function _isClobbered(elm) {
          if (elm instanceof Text || elm instanceof Comment) {
            return false;
          }

          if (typeof elm.nodeName !== 'string' || typeof elm.textContent !== 'string' || typeof elm.removeChild !== 'function' || !(elm.attributes instanceof NamedNodeMap) || typeof elm.removeAttribute !== 'function' || typeof elm.setAttribute !== 'function' || typeof elm.namespaceURI !== 'string' || typeof elm.insertBefore !== 'function') {
            return true;
          }

          return false;
        };

        /**
         * _isNode
         *
         * @param  {Node} obj object to check whether it's a DOM node
         * @return {Boolean} true is object is a DOM node
         */
        var _isNode = function _isNode(object) {
          return (typeof Node === 'undefined' ? 'undefined' : _typeof(Node)) === 'object' ? object instanceof Node : object && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' && typeof object.nodeType === 'number' && typeof object.nodeName === 'string';
        };

        /**
         * _executeHook
         * Execute user configurable hooks
         *
         * @param  {String} entryPoint  Name of the hook's entry point
         * @param  {Node} currentNode node to work on with the hook
         * @param  {Object} data additional hook parameters
         */
        var _executeHook = function _executeHook(entryPoint, currentNode, data) {
          if (!hooks[entryPoint]) {
            return;
          }

          arrayForEach(hooks[entryPoint], function (hook) {
            hook.call(DOMPurify, currentNode, data, CONFIG);
          });
        };

        /**
         * _sanitizeElements
         *
         * @protect nodeName
         * @protect textContent
         * @protect removeChild
         *
         * @param   {Node} currentNode to check for permission to exist
         * @return  {Boolean} true if node was killed, false if left alive
         */
        var _sanitizeElements = function _sanitizeElements(currentNode) {
          var content = void 0;

          /* Execute a hook if present */
          _executeHook('beforeSanitizeElements', currentNode, null);

          /* Check if element is clobbered or can clobber */
          if (_isClobbered(currentNode)) {
            _forceRemove(currentNode);
            return true;
          }

          /* Check if tagname contains Unicode */
          if (stringMatch(currentNode.nodeName, /[\u0080-\uFFFF]/)) {
            _forceRemove(currentNode);
            return true;
          }

          /* Now let's check the element's type and name */
          var tagName = stringToLowerCase(currentNode.nodeName);

          /* Execute a hook if present */
          _executeHook('uponSanitizeElement', currentNode, {
            tagName: tagName,
            allowedTags: ALLOWED_TAGS
          });

          /* Detect mXSS attempts abusing namespace confusion */
          if (!_isNode(currentNode.firstElementChild) && (!_isNode(currentNode.content) || !_isNode(currentNode.content.firstElementChild)) && regExpTest(/<[/\w]/g, currentNode.innerHTML) && regExpTest(/<[/\w]/g, currentNode.textContent)) {
            _forceRemove(currentNode);
            return true;
          }

          /* Remove element if anything forbids its presence */
          if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
            /* Keep content except for bad-listed elements */
            if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
              var parentNode = getParentNode(currentNode);
              var childNodes = getChildNodes(currentNode);

              if (childNodes && parentNode) {
                var childCount = childNodes.length;

                for (var i = childCount - 1; i >= 0; --i) {
                  parentNode.insertBefore(cloneNode(childNodes[i], true), getNextSibling(currentNode));
                }
              }
            }

            _forceRemove(currentNode);
            return true;
          }

          /* Check whether element has a valid namespace */
          if (currentNode instanceof Element && !_checkValidNamespace(currentNode)) {
            _forceRemove(currentNode);
            return true;
          }

          if ((tagName === 'noscript' || tagName === 'noembed') && regExpTest(/<\/no(script|embed)/i, currentNode.innerHTML)) {
            _forceRemove(currentNode);
            return true;
          }

          /* Sanitize element content to be template-safe */
          if (SAFE_FOR_TEMPLATES && currentNode.nodeType === 3) {
            /* Get the element's text content */
            content = currentNode.textContent;
            content = stringReplace(content, MUSTACHE_EXPR$$1, ' ');
            content = stringReplace(content, ERB_EXPR$$1, ' ');
            if (currentNode.textContent !== content) {
              arrayPush(DOMPurify.removed, { element: currentNode.cloneNode() });
              currentNode.textContent = content;
            }
          }

          /* Execute a hook if present */
          _executeHook('afterSanitizeElements', currentNode, null);

          return false;
        };

        /**
         * _isValidAttribute
         *
         * @param  {string} lcTag Lowercase tag name of containing element.
         * @param  {string} lcName Lowercase attribute name.
         * @param  {string} value Attribute value.
         * @return {Boolean} Returns true if `value` is valid, otherwise false.
         */
        // eslint-disable-next-line complexity
        var _isValidAttribute = function _isValidAttribute(lcTag, lcName, value) {
          /* Make sure attribute cannot clobber */
          if (SANITIZE_DOM && (lcName === 'id' || lcName === 'name') && (value in document || value in formElement)) {
            return false;
          }

          /* Allow valid data-* attributes: At least one character after "-"
              (https://html.spec.whatwg.org/multipage/dom.html#embedding-custom-non-visible-data-with-the-data-*-attributes)
              XML-compatible (https://html.spec.whatwg.org/multipage/infrastructure.html#xml-compatible and http://www.w3.org/TR/xml/#d0e804)
              We don't need to check the value; it's always URI safe. */
          if (ALLOW_DATA_ATTR && regExpTest(DATA_ATTR$$1, lcName)) ; else if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR$$1, lcName)) ; else if (!ALLOWED_ATTR[lcName] || FORBID_ATTR[lcName]) {
            return false;

            /* Check value is safe. First, is attr inert? If so, is safe */
          } else if (URI_SAFE_ATTRIBUTES[lcName]) ; else if (regExpTest(IS_ALLOWED_URI$$1, stringReplace(value, ATTR_WHITESPACE$$1, ''))) ; else if ((lcName === 'src' || lcName === 'xlink:href' || lcName === 'href') && lcTag !== 'script' && stringIndexOf(value, 'data:') === 0 && DATA_URI_TAGS[lcTag]) ; else if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA$$1, stringReplace(value, ATTR_WHITESPACE$$1, ''))) ; else if (!value) ; else {
            return false;
          }

          return true;
        };

        /**
         * _sanitizeAttributes
         *
         * @protect attributes
         * @protect nodeName
         * @protect removeAttribute
         * @protect setAttribute
         *
         * @param  {Node} currentNode to sanitize
         */
        var _sanitizeAttributes = function _sanitizeAttributes(currentNode) {
          var attr = void 0;
          var value = void 0;
          var lcName = void 0;
          var l = void 0;
          /* Execute a hook if present */
          _executeHook('beforeSanitizeAttributes', currentNode, null);

          var attributes = currentNode.attributes;

          /* Check if we have attributes; if not we might have a text node */

          if (!attributes) {
            return;
          }

          var hookEvent = {
            attrName: '',
            attrValue: '',
            keepAttr: true,
            allowedAttributes: ALLOWED_ATTR
          };
          l = attributes.length;

          /* Go backwards over all attributes; safely remove bad ones */
          while (l--) {
            attr = attributes[l];
            var _attr = attr,
                name = _attr.name,
                namespaceURI = _attr.namespaceURI;

            value = stringTrim(attr.value);
            lcName = stringToLowerCase(name);

            /* Execute a hook if present */
            hookEvent.attrName = lcName;
            hookEvent.attrValue = value;
            hookEvent.keepAttr = true;
            hookEvent.forceKeepAttr = undefined; // Allows developers to see this is a property they can set
            _executeHook('uponSanitizeAttribute', currentNode, hookEvent);
            value = hookEvent.attrValue;
            /* Did the hooks approve of the attribute? */
            if (hookEvent.forceKeepAttr) {
              continue;
            }

            /* Remove attribute */
            _removeAttribute(name, currentNode);

            /* Did the hooks approve of the attribute? */
            if (!hookEvent.keepAttr) {
              continue;
            }

            /* Work around a security issue in jQuery 3.0 */
            if (regExpTest(/\/>/i, value)) {
              _removeAttribute(name, currentNode);
              continue;
            }

            /* Sanitize attribute content to be template-safe */
            if (SAFE_FOR_TEMPLATES) {
              value = stringReplace(value, MUSTACHE_EXPR$$1, ' ');
              value = stringReplace(value, ERB_EXPR$$1, ' ');
            }

            /* Is `value` valid for this attribute? */
            var lcTag = currentNode.nodeName.toLowerCase();
            if (!_isValidAttribute(lcTag, lcName, value)) {
              continue;
            }

            /* Handle invalid data-* attribute set by try-catching it */
            try {
              if (namespaceURI) {
                currentNode.setAttributeNS(namespaceURI, name, value);
              } else {
                /* Fallback to setAttribute() for browser-unrecognized namespaces e.g. "x-schema". */
                currentNode.setAttribute(name, value);
              }

              arrayPop(DOMPurify.removed);
            } catch (_) {}
          }

          /* Execute a hook if present */
          _executeHook('afterSanitizeAttributes', currentNode, null);
        };

        /**
         * _sanitizeShadowDOM
         *
         * @param  {DocumentFragment} fragment to iterate over recursively
         */
        var _sanitizeShadowDOM = function _sanitizeShadowDOM(fragment) {
          var shadowNode = void 0;
          var shadowIterator = _createIterator(fragment);

          /* Execute a hook if present */
          _executeHook('beforeSanitizeShadowDOM', fragment, null);

          while (shadowNode = shadowIterator.nextNode()) {
            /* Execute a hook if present */
            _executeHook('uponSanitizeShadowNode', shadowNode, null);

            /* Sanitize tags and elements */
            if (_sanitizeElements(shadowNode)) {
              continue;
            }

            /* Deep shadow DOM detected */
            if (shadowNode.content instanceof DocumentFragment) {
              _sanitizeShadowDOM(shadowNode.content);
            }

            /* Check attributes, sanitize if necessary */
            _sanitizeAttributes(shadowNode);
          }

          /* Execute a hook if present */
          _executeHook('afterSanitizeShadowDOM', fragment, null);
        };

        /**
         * Sanitize
         * Public method providing core sanitation functionality
         *
         * @param {String|Node} dirty string or DOM node
         * @param {Object} configuration object
         */
        // eslint-disable-next-line complexity
        DOMPurify.sanitize = function (dirty, cfg) {
          var body = void 0;
          var importedNode = void 0;
          var currentNode = void 0;
          var oldNode = void 0;
          var returnNode = void 0;
          /* Make sure we have a string to sanitize.
            DO NOT return early, as this will return the wrong type if
            the user has requested a DOM object rather than a string */
          if (!dirty) {
            dirty = '<!-->';
          }

          /* Stringify, in case dirty is an object */
          if (typeof dirty !== 'string' && !_isNode(dirty)) {
            // eslint-disable-next-line no-negated-condition
            if (typeof dirty.toString !== 'function') {
              throw typeErrorCreate('toString is not a function');
            } else {
              dirty = dirty.toString();
              if (typeof dirty !== 'string') {
                throw typeErrorCreate('dirty is not a string, aborting');
              }
            }
          }

          /* Check we can run. Otherwise fall back or ignore */
          if (!DOMPurify.isSupported) {
            if (_typeof(window.toStaticHTML) === 'object' || typeof window.toStaticHTML === 'function') {
              if (typeof dirty === 'string') {
                return window.toStaticHTML(dirty);
              }

              if (_isNode(dirty)) {
                return window.toStaticHTML(dirty.outerHTML);
              }
            }

            return dirty;
          }

          /* Assign config vars */
          if (!SET_CONFIG) {
            _parseConfig(cfg);
          }

          /* Clean up removed elements */
          DOMPurify.removed = [];

          /* Check if dirty is correctly typed for IN_PLACE */
          if (typeof dirty === 'string') {
            IN_PLACE = false;
          }

          if (IN_PLACE) ; else if (dirty instanceof Node) {
            /* If dirty is a DOM element, append to an empty document to avoid
               elements being stripped by the parser */
            body = _initDocument('<!---->');
            importedNode = body.ownerDocument.importNode(dirty, true);
            if (importedNode.nodeType === 1 && importedNode.nodeName === 'BODY') {
              /* Node is already a body, use as is */
              body = importedNode;
            } else if (importedNode.nodeName === 'HTML') {
              body = importedNode;
            } else {
              // eslint-disable-next-line unicorn/prefer-node-append
              body.appendChild(importedNode);
            }
          } else {
            /* Exit directly if we have nothing to do */
            if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT &&
            // eslint-disable-next-line unicorn/prefer-includes
            dirty.indexOf('<') === -1) {
              return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(dirty) : dirty;
            }

            /* Initialize the document to work on */
            body = _initDocument(dirty);

            /* Check we have a DOM node from the data */
            if (!body) {
              return RETURN_DOM ? null : emptyHTML;
            }
          }

          /* Remove first element node (ours) if FORCE_BODY is set */
          if (body && FORCE_BODY) {
            _forceRemove(body.firstChild);
          }

          /* Get node iterator */
          var nodeIterator = _createIterator(IN_PLACE ? dirty : body);

          /* Now start iterating over the created document */
          while (currentNode = nodeIterator.nextNode()) {
            /* Fix IE's strange behavior with manipulated textNodes #89 */
            if (currentNode.nodeType === 3 && currentNode === oldNode) {
              continue;
            }

            /* Sanitize tags and elements */
            if (_sanitizeElements(currentNode)) {
              continue;
            }

            /* Shadow DOM detected, sanitize it */
            if (currentNode.content instanceof DocumentFragment) {
              _sanitizeShadowDOM(currentNode.content);
            }

            /* Check attributes, sanitize if necessary */
            _sanitizeAttributes(currentNode);

            oldNode = currentNode;
          }

          oldNode = null;

          /* If we sanitized `dirty` in-place, return it. */
          if (IN_PLACE) {
            return dirty;
          }

          /* Return sanitized string or DOM */
          if (RETURN_DOM) {
            if (RETURN_DOM_FRAGMENT) {
              returnNode = createDocumentFragment.call(body.ownerDocument);

              while (body.firstChild) {
                // eslint-disable-next-line unicorn/prefer-node-append
                returnNode.appendChild(body.firstChild);
              }
            } else {
              returnNode = body;
            }

            if (RETURN_DOM_IMPORT) {
              /*
                AdoptNode() is not used because internal state is not reset
                (e.g. the past names map of a HTMLFormElement), this is safe
                in theory but we would rather not risk another attack vector.
                The state that is cloned by importNode() is explicitly defined
                by the specs.
              */
              returnNode = importNode.call(originalDocument, returnNode, true);
            }

            return returnNode;
          }

          var serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;

          /* Sanitize final string template-safe */
          if (SAFE_FOR_TEMPLATES) {
            serializedHTML = stringReplace(serializedHTML, MUSTACHE_EXPR$$1, ' ');
            serializedHTML = stringReplace(serializedHTML, ERB_EXPR$$1, ' ');
          }

          return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(serializedHTML) : serializedHTML;
        };

        /**
         * Public method to set the configuration once
         * setConfig
         *
         * @param {Object} cfg configuration object
         */
        DOMPurify.setConfig = function (cfg) {
          _parseConfig(cfg);
          SET_CONFIG = true;
        };

        /**
         * Public method to remove the configuration
         * clearConfig
         *
         */
        DOMPurify.clearConfig = function () {
          CONFIG = null;
          SET_CONFIG = false;
        };

        /**
         * Public method to check if an attribute value is valid.
         * Uses last set config, if any. Otherwise, uses config defaults.
         * isValidAttribute
         *
         * @param  {string} tag Tag name of containing element.
         * @param  {string} attr Attribute name.
         * @param  {string} value Attribute value.
         * @return {Boolean} Returns true if `value` is valid. Otherwise, returns false.
         */
        DOMPurify.isValidAttribute = function (tag, attr, value) {
          /* Initialize shared config vars if necessary. */
          if (!CONFIG) {
            _parseConfig({});
          }

          var lcTag = stringToLowerCase(tag);
          var lcName = stringToLowerCase(attr);
          return _isValidAttribute(lcTag, lcName, value);
        };

        /**
         * AddHook
         * Public method to add DOMPurify hooks
         *
         * @param {String} entryPoint entry point for the hook to add
         * @param {Function} hookFunction function to execute
         */
        DOMPurify.addHook = function (entryPoint, hookFunction) {
          if (typeof hookFunction !== 'function') {
            return;
          }

          hooks[entryPoint] = hooks[entryPoint] || [];
          arrayPush(hooks[entryPoint], hookFunction);
        };

        /**
         * RemoveHook
         * Public method to remove a DOMPurify hook at a given entryPoint
         * (pops it from the stack of hooks if more are present)
         *
         * @param {String} entryPoint entry point for the hook to remove
         */
        DOMPurify.removeHook = function (entryPoint) {
          if (hooks[entryPoint]) {
            arrayPop(hooks[entryPoint]);
          }
        };

        /**
         * RemoveHooks
         * Public method to remove all DOMPurify hooks at a given entryPoint
         *
         * @param  {String} entryPoint entry point for the hooks to remove
         */
        DOMPurify.removeHooks = function (entryPoint) {
          if (hooks[entryPoint]) {
            hooks[entryPoint] = [];
          }
        };

        /**
         * RemoveAllHooks
         * Public method to remove all DOMPurify hooks
         *
         */
        DOMPurify.removeAllHooks = function () {
          hooks = {};
        };

        return DOMPurify;
      }

      var purify = createDOMPurify();

      return purify;

    }));

    });

    /* src/components/sidebar/details/MarkdownField.svelte generated by Svelte v3.35.0 */
    const file$c = "src/components/sidebar/details/MarkdownField.svelte";

    // (12:0) {#if !isEmpty}
    function create_if_block$3(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*type*/ ctx[2] == "notitle") return create_if_block_1$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(12:0) {#if !isEmpty}",
    		ctx
    	});

    	return block;
    }

    // (15:3) {:else}
    function create_else_block$1(ctx) {
    	let span;
    	let strong;
    	let t0;
    	let t1;
    	let html_tag;
    	let raw_value = purify.sanitize(marked(/*content*/ ctx[1])) + "";

    	const block = {
    		c: function create() {
    			span = element("span");
    			strong = element("strong");
    			t0 = text(/*title*/ ctx[0]);
    			t1 = text(": ");
    			add_location(strong, file$c, 15, 10, 355);
    			html_tag = new HtmlTag(null);
    			add_location(span, file$c, 15, 4, 349);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, strong);
    			append_dev(strong, t0);
    			append_dev(strong, t1);
    			html_tag.m(raw_value, span);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data_dev(t0, /*title*/ ctx[0]);
    			if (dirty & /*content*/ 2 && raw_value !== (raw_value = purify.sanitize(marked(/*content*/ ctx[1])) + "")) html_tag.p(raw_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(15:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (13:3) {#if type == "notitle"}
    function create_if_block_1$1(ctx) {
    	let span;
    	let raw_value = purify.sanitize(marked(/*content*/ ctx[1])) + "";

    	const block = {
    		c: function create() {
    			span = element("span");
    			add_location(span, file$c, 13, 4, 277);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			span.innerHTML = raw_value;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*content*/ 2 && raw_value !== (raw_value = purify.sanitize(marked(/*content*/ ctx[1])) + "")) span.innerHTML = raw_value;		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(13:3) {#if type == \\\"notitle\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let if_block_anchor;
    	let if_block = !/*isEmpty*/ ctx[3] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (!/*isEmpty*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let isEmpty;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("MarkdownField", slots, []);
    	let { title = "" } = $$props;
    	let { content = "" } = $$props;
    	let { type = "type" } = $$props;
    	const writable_props = ["title", "content", "type"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MarkdownField> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("content" in $$props) $$invalidate(1, content = $$props.content);
    		if ("type" in $$props) $$invalidate(2, type = $$props.type);
    	};

    	$$self.$capture_state = () => ({
    		marked,
    		DOMPurify: purify,
    		title,
    		content,
    		type,
    		isEmpty
    	});

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("content" in $$props) $$invalidate(1, content = $$props.content);
    		if ("type" in $$props) $$invalidate(2, type = $$props.type);
    		if ("isEmpty" in $$props) $$invalidate(3, isEmpty = $$props.isEmpty);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*content*/ 2) {
    			 $$invalidate(3, isEmpty = !content || content.trim().length === 0);
    		}
    	};

    	return [title, content, type, isEmpty];
    }

    class MarkdownField extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { title: 0, content: 1, type: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MarkdownField",
    			options,
    			id: create_fragment$c.name
    		});
    	}

    	get title() {
    		throw new Error("<MarkdownField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<MarkdownField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get content() {
    		throw new Error("<MarkdownField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set content(value) {
    		throw new Error("<MarkdownField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<MarkdownField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<MarkdownField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function formatPhoneNumber(phoneNumberString){
        //from maerics via https://stackoverflow.com/questions/8358084/regular-expression-to-reformat-a-us-phone-number-in-javascript
        const cleaned = ('' + phoneNumberString).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return '(' + match[1] + ')' + match[2] + '-' + match[3]
        }
        return phoneNumberString
    }

    //from https://stackoverflow.com/questions/11300906/check-if-a-string-starts-with-http-using-javascript
    function getValidUrl(url = ""){
        let newUrl = window.decodeURIComponent(url);
        newUrl = newUrl.trim().replace(/\s/g, "");

        if(/^(:\/\/)/.test(newUrl)){
            return `http${newUrl}`;
        }
        if(!/^(f|ht)tps?:\/\//i.test(newUrl)){
            return `http://${newUrl}`;
        }

        return newUrl;
    }

    /* src/components/FontawesomeIcon.svelte generated by Svelte v3.35.0 */

    const file$d = "src/components/FontawesomeIcon.svelte";

    function create_fragment$d(ctx) {
    	let span;
    	let span_class_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			attr_dev(span, "class", span_class_value = "fab fa-" + /*icon*/ ctx[0] + " small" + " svelte-1fujr1o");
    			attr_dev(span, "translate", "no");
    			attr_dev(span, "title", /*alt*/ ctx[1]);
    			add_location(span, file$d, 5, 0, 69);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*icon*/ 1 && span_class_value !== (span_class_value = "fab fa-" + /*icon*/ ctx[0] + " small" + " svelte-1fujr1o")) {
    				attr_dev(span, "class", span_class_value);
    			}

    			if (dirty & /*alt*/ 2) {
    				attr_dev(span, "title", /*alt*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FontawesomeIcon", slots, []);
    	let { icon = "" } = $$props;
    	let { alt = "" } = $$props;
    	const writable_props = ["icon", "alt"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FontawesomeIcon> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("icon" in $$props) $$invalidate(0, icon = $$props.icon);
    		if ("alt" in $$props) $$invalidate(1, alt = $$props.alt);
    	};

    	$$self.$capture_state = () => ({ icon, alt });

    	$$self.$inject_state = $$props => {
    		if ("icon" in $$props) $$invalidate(0, icon = $$props.icon);
    		if ("alt" in $$props) $$invalidate(1, alt = $$props.alt);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [icon, alt];
    }

    class FontawesomeIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { icon: 0, alt: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FontawesomeIcon",
    			options,
    			id: create_fragment$d.name
    		});
    	}

    	get icon() {
    		throw new Error("<FontawesomeIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icon(value) {
    		throw new Error("<FontawesomeIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get alt() {
    		throw new Error("<FontawesomeIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set alt(value) {
    		throw new Error("<FontawesomeIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/sidebar/details/ItemDetailsInfo.svelte generated by Svelte v3.35.0 */
    const file$e = "src/components/sidebar/details/ItemDetailsInfo.svelte";

    // (33:4) {:else}
    function create_else_block_1(ctx) {
    	let p;
    	let materialicon;
    	let t;
    	let current;

    	materialicon = new MaterialIcon({
    			props: { icon: /*icon*/ ctx[2] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			p = element("p");
    			create_component(materialicon.$$.fragment);
    			t = text(/*text*/ ctx[0]);
    			attr_dev(p, "class", "info svelte-ard13f");
    			add_location(p, file$e, 33, 8, 1102);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			mount_component(materialicon, p, null);
    			append_dev(p, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const materialicon_changes = {};
    			if (dirty & /*icon*/ 4) materialicon_changes.icon = /*icon*/ ctx[2];
    			materialicon.$set(materialicon_changes);
    			if (!current || dirty & /*text*/ 1) set_data_dev(t, /*text*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(materialicon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(materialicon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			destroy_component(materialicon);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(33:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (25:33) 
    function create_if_block_2(ctx) {
    	let a;
    	let current_block_type_index;
    	let if_block;
    	let a_href_value;
    	let current;
    	const if_block_creators = [create_if_block_3, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*icontype*/ ctx[4] == "mdi") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			a = element("a");
    			if_block.c();
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", a_href_value = getValidUrl(/*url*/ ctx[1]));
    			add_location(a, file$e, 25, 8, 825);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			if_blocks[current_block_type_index].m(a, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(a, null);
    			}

    			if (!current || dirty & /*url*/ 2 && a_href_value !== (a_href_value = getValidUrl(/*url*/ ctx[1]))) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(25:33) ",
    		ctx
    	});

    	return block;
    }

    // (19:31) 
    function create_if_block_1$2(ctx) {
    	let a;
    	let p;
    	let materialicon;
    	let t;
    	let a_href_value;
    	let current;

    	materialicon = new MaterialIcon({
    			props: {
    				icon: /*icon*/ ctx[2],
    				alt: "Phone Number"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			a = element("a");
    			p = element("p");
    			create_component(materialicon.$$.fragment);
    			t = text(/*text*/ ctx[0]);
    			attr_dev(p, "class", "info svelte-ard13f");
    			add_location(p, file$e, 20, 12, 667);
    			attr_dev(a, "href", a_href_value = "tel:" + formatPhoneNumber(/*text*/ ctx[0]));
    			add_location(a, file$e, 19, 8, 614);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, p);
    			mount_component(materialicon, p, null);
    			append_dev(p, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const materialicon_changes = {};
    			if (dirty & /*icon*/ 4) materialicon_changes.icon = /*icon*/ ctx[2];
    			materialicon.$set(materialicon_changes);
    			if (!current || dirty & /*text*/ 1) set_data_dev(t, /*text*/ ctx[0]);

    			if (!current || dirty & /*text*/ 1 && a_href_value !== (a_href_value = "tel:" + formatPhoneNumber(/*text*/ ctx[0]))) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(materialicon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(materialicon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			destroy_component(materialicon);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(19:31) ",
    		ctx
    	});

    	return block;
    }

    // (13:4) {#if type === 'email'}
    function create_if_block$4(ctx) {
    	let a;
    	let p;
    	let materialicon;
    	let t;
    	let a_href_value;
    	let current;

    	materialicon = new MaterialIcon({
    			props: {
    				icon: /*icon*/ ctx[2],
    				alt: "Email Address"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			a = element("a");
    			p = element("p");
    			create_component(materialicon.$$.fragment);
    			t = text(/*text*/ ctx[0]);
    			attr_dev(p, "class", "info svelte-ard13f");
    			add_location(p, file$e, 14, 12, 457);
    			attr_dev(a, "href", a_href_value = "mailto:" + /*text*/ ctx[0]);
    			add_location(a, file$e, 13, 8, 420);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, p);
    			mount_component(materialicon, p, null);
    			append_dev(p, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const materialicon_changes = {};
    			if (dirty & /*icon*/ 4) materialicon_changes.icon = /*icon*/ ctx[2];
    			materialicon.$set(materialicon_changes);
    			if (!current || dirty & /*text*/ 1) set_data_dev(t, /*text*/ ctx[0]);

    			if (!current || dirty & /*text*/ 1 && a_href_value !== (a_href_value = "mailto:" + /*text*/ ctx[0])) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(materialicon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(materialicon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			destroy_component(materialicon);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(13:4) {#if type === 'email'}",
    		ctx
    	});

    	return block;
    }

    // (29:11) {:else}
    function create_else_block$2(ctx) {
    	let fontawesomeicon;
    	let t;
    	let current;

    	fontawesomeicon = new FontawesomeIcon({
    			props: { icon: /*icon*/ ctx[2], alt: "Website" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(fontawesomeicon.$$.fragment);
    			t = text(/*text*/ ctx[0]);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fontawesomeicon, target, anchor);
    			insert_dev(target, t, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fontawesomeicon_changes = {};
    			if (dirty & /*icon*/ 4) fontawesomeicon_changes.icon = /*icon*/ ctx[2];
    			fontawesomeicon.$set(fontawesomeicon_changes);
    			if (!current || dirty & /*text*/ 1) set_data_dev(t, /*text*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fontawesomeicon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fontawesomeicon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fontawesomeicon, detaching);
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(29:11) {:else}",
    		ctx
    	});

    	return block;
    }

    // (27:11) {#if icontype == 'mdi'}
    function create_if_block_3(ctx) {
    	let materialicon;
    	let t;
    	let current;

    	materialicon = new MaterialIcon({
    			props: { icon: /*icon*/ ctx[2], alt: "website" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(materialicon.$$.fragment);
    			t = text(/*text*/ ctx[0]);
    		},
    		m: function mount(target, anchor) {
    			mount_component(materialicon, target, anchor);
    			insert_dev(target, t, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const materialicon_changes = {};
    			if (dirty & /*icon*/ 4) materialicon_changes.icon = /*icon*/ ctx[2];
    			materialicon.$set(materialicon_changes);
    			if (!current || dirty & /*text*/ 1) set_data_dev(t, /*text*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(materialicon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(materialicon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(materialicon, detaching);
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(27:11) {#if icontype == 'mdi'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$4, create_if_block_1$2, create_if_block_2, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*type*/ ctx[3] === "email") return 0;
    		if (/*type*/ ctx[3] === "phone") return 1;
    		if (/*type*/ ctx[3] === "website") return 2;
    		return 3;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ItemDetailsInfo", slots, []);
    	let { text = "" } = $$props;
    	let { url = "" } = $$props;
    	let { icon = "indeterminate_check_box" } = $$props;
    	let { type = "text" } = $$props;
    	let { icontype = "icontype" } = $$props;
    	const writable_props = ["text", "url", "icon", "type", "icontype"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ItemDetailsInfo> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("text" in $$props) $$invalidate(0, text = $$props.text);
    		if ("url" in $$props) $$invalidate(1, url = $$props.url);
    		if ("icon" in $$props) $$invalidate(2, icon = $$props.icon);
    		if ("type" in $$props) $$invalidate(3, type = $$props.type);
    		if ("icontype" in $$props) $$invalidate(4, icontype = $$props.icontype);
    	};

    	$$self.$capture_state = () => ({
    		formatPhoneNumber,
    		getValidUrl,
    		MaterialIcon,
    		FontawesomeIcon,
    		text,
    		url,
    		icon,
    		type,
    		icontype
    	});

    	$$self.$inject_state = $$props => {
    		if ("text" in $$props) $$invalidate(0, text = $$props.text);
    		if ("url" in $$props) $$invalidate(1, url = $$props.url);
    		if ("icon" in $$props) $$invalidate(2, icon = $$props.icon);
    		if ("type" in $$props) $$invalidate(3, type = $$props.type);
    		if ("icontype" in $$props) $$invalidate(4, icontype = $$props.icontype);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [text, url, icon, type, icontype];
    }

    class ItemDetailsInfo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {
    			text: 0,
    			url: 1,
    			icon: 2,
    			type: 3,
    			icontype: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ItemDetailsInfo",
    			options,
    			id: create_fragment$e.name
    		});
    	}

    	get text() {
    		throw new Error("<ItemDetailsInfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<ItemDetailsInfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<ItemDetailsInfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<ItemDetailsInfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get icon() {
    		throw new Error("<ItemDetailsInfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icon(value) {
    		throw new Error("<ItemDetailsInfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<ItemDetailsInfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<ItemDetailsInfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get icontype() {
    		throw new Error("<ItemDetailsInfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icontype(value) {
    		throw new Error("<ItemDetailsInfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/sidebar/details/PickupDelivery.svelte generated by Svelte v3.35.0 */
    const file$f = "src/components/sidebar/details/PickupDelivery.svelte";

    function create_fragment$f(ctx) {
    	let div4;
    	let div1;
    	let div0;
    	let span0;
    	let strong0;
    	let t1;
    	let span1;
    	let t2;
    	let span1_class_value;
    	let t3;
    	let div3;
    	let div2;
    	let span2;
    	let strong1;
    	let t5;
    	let span3;
    	let t6;
    	let span3_class_value;
    	let t7;
    	let markdownfield;
    	let current;

    	markdownfield = new MarkdownField({
    			props: {
    				title: "Delivery/Pickup Notes",
    				content: /*notes*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			strong0 = element("strong");
    			strong0.textContent = "Pickup";
    			t1 = space();
    			span1 = element("span");
    			t2 = text(/*pickup*/ ctx[0]);
    			t3 = space();
    			div3 = element("div");
    			div2 = element("div");
    			span2 = element("span");
    			strong1 = element("strong");
    			strong1.textContent = "Delivery";
    			t5 = space();
    			span3 = element("span");
    			t6 = text(/*delivery*/ ctx[1]);
    			t7 = space();
    			create_component(markdownfield.$$.fragment);
    			add_location(strong0, file$f, 12, 30, 290);
    			attr_dev(span0, "class", "tag");
    			add_location(span0, file$f, 12, 12, 272);

    			attr_dev(span1, "class", span1_class_value = "tag " + (/*pickup*/ ctx[0].toLowerCase().includes("yes")
    			? "is-success"
    			: "is-white"));

    			add_location(span1, file$f, 13, 12, 333);
    			attr_dev(div0, "class", "tags has-addons");
    			add_location(div0, file$f, 11, 8, 230);
    			attr_dev(div1, "class", "control");
    			add_location(div1, file$f, 10, 4, 200);
    			add_location(strong1, file$f, 22, 30, 586);
    			attr_dev(span2, "class", "tag");
    			add_location(span2, file$f, 22, 12, 568);

    			attr_dev(span3, "class", span3_class_value = "tag " + (/*delivery*/ ctx[1].toLowerCase().includes("yes")
    			? "is-success"
    			: "is-white"));

    			add_location(span3, file$f, 23, 12, 631);
    			attr_dev(div2, "class", "tags has-addons");
    			add_location(div2, file$f, 21, 8, 526);
    			attr_dev(div3, "class", "control");
    			add_location(div3, file$f, 20, 4, 496);
    			attr_dev(div4, "class", "field is-grouped is-grouped-multiline");
    			add_location(div4, file$f, 9, 0, 144);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div1);
    			append_dev(div1, div0);
    			append_dev(div0, span0);
    			append_dev(span0, strong0);
    			append_dev(div0, t1);
    			append_dev(div0, span1);
    			append_dev(span1, t2);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, span2);
    			append_dev(span2, strong1);
    			append_dev(div2, t5);
    			append_dev(div2, span3);
    			append_dev(span3, t6);
    			insert_dev(target, t7, anchor);
    			mount_component(markdownfield, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*pickup*/ 1) set_data_dev(t2, /*pickup*/ ctx[0]);

    			if (!current || dirty & /*pickup*/ 1 && span1_class_value !== (span1_class_value = "tag " + (/*pickup*/ ctx[0].toLowerCase().includes("yes")
    			? "is-success"
    			: "is-white"))) {
    				attr_dev(span1, "class", span1_class_value);
    			}

    			if (!current || dirty & /*delivery*/ 2) set_data_dev(t6, /*delivery*/ ctx[1]);

    			if (!current || dirty & /*delivery*/ 2 && span3_class_value !== (span3_class_value = "tag " + (/*delivery*/ ctx[1].toLowerCase().includes("yes")
    			? "is-success"
    			: "is-white"))) {
    				attr_dev(span3, "class", span3_class_value);
    			}

    			const markdownfield_changes = {};
    			if (dirty & /*notes*/ 4) markdownfield_changes.content = /*notes*/ ctx[2];
    			markdownfield.$set(markdownfield_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(markdownfield.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(markdownfield.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t7);
    			destroy_component(markdownfield, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PickupDelivery", slots, []);
    	let { pickup } = $$props;
    	let { delivery } = $$props;
    	let { notes } = $$props;
    	const writable_props = ["pickup", "delivery", "notes"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PickupDelivery> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("pickup" in $$props) $$invalidate(0, pickup = $$props.pickup);
    		if ("delivery" in $$props) $$invalidate(1, delivery = $$props.delivery);
    		if ("notes" in $$props) $$invalidate(2, notes = $$props.notes);
    	};

    	$$self.$capture_state = () => ({ MarkdownField, pickup, delivery, notes });

    	$$self.$inject_state = $$props => {
    		if ("pickup" in $$props) $$invalidate(0, pickup = $$props.pickup);
    		if ("delivery" in $$props) $$invalidate(1, delivery = $$props.delivery);
    		if ("notes" in $$props) $$invalidate(2, notes = $$props.notes);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [pickup, delivery, notes];
    }

    class PickupDelivery extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, { pickup: 0, delivery: 1, notes: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PickupDelivery",
    			options,
    			id: create_fragment$f.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*pickup*/ ctx[0] === undefined && !("pickup" in props)) {
    			console.warn("<PickupDelivery> was created without expected prop 'pickup'");
    		}

    		if (/*delivery*/ ctx[1] === undefined && !("delivery" in props)) {
    			console.warn("<PickupDelivery> was created without expected prop 'delivery'");
    		}

    		if (/*notes*/ ctx[2] === undefined && !("notes" in props)) {
    			console.warn("<PickupDelivery> was created without expected prop 'notes'");
    		}
    	}

    	get pickup() {
    		throw new Error("<PickupDelivery>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pickup(value) {
    		throw new Error("<PickupDelivery>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get delivery() {
    		throw new Error("<PickupDelivery>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set delivery(value) {
    		throw new Error("<PickupDelivery>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get notes() {
    		throw new Error("<PickupDelivery>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set notes(value) {
    		throw new Error("<PickupDelivery>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/sidebar/details/LastUpdated.svelte generated by Svelte v3.35.0 */
    const file$g = "src/components/sidebar/details/LastUpdated.svelte";

    // (17:4) {:else}
    function create_else_block$3(ctx) {
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("Updated: ");
    			t1 = text(/*date*/ ctx[1]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*date*/ 2) set_data_dev(t1, /*date*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(17:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (15:39) 
    function create_if_block_1$3(ctx) {
    	let abbr;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			abbr = element("abbr");
    			t0 = text("Updated: ");
    			t1 = text(/*date*/ ctx[1]);
    			attr_dev(abbr, "title", /*source*/ ctx[0]);
    			add_location(abbr, file$g, 15, 8, 404);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, abbr, anchor);
    			append_dev(abbr, t0);
    			append_dev(abbr, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*date*/ 2) set_data_dev(t1, /*date*/ ctx[1]);

    			if (dirty & /*source*/ 1) {
    				attr_dev(abbr, "title", /*source*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(abbr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(15:39) ",
    		ctx
    	});

    	return block;
    }

    // (13:4) {#if sourceIsLink}
    function create_if_block$5(ctx) {
    	let a;
    	let t0;
    	let t1;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t0 = text("Updated: ");
    			t1 = text(/*date*/ ctx[1]);
    			attr_dev(a, "href", a_href_value = getValidUrl(/*source*/ ctx[0]));
    			attr_dev(a, "class", "svelte-1yvnszj");
    			add_location(a, file$g, 13, 8, 306);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*date*/ 2) set_data_dev(t1, /*date*/ ctx[1]);

    			if (dirty & /*source*/ 1 && a_href_value !== (a_href_value = getValidUrl(/*source*/ ctx[0]))) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(13:4) {#if sourceIsLink}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$g(ctx) {
    	let p;
    	let show_if;

    	function select_block_type(ctx, dirty) {
    		if (/*sourceIsLink*/ ctx[2]) return create_if_block$5;
    		if (show_if == null || dirty & /*source*/ 1) show_if = !!(/*source*/ ctx[0].trim().length > 0);
    		if (show_if) return create_if_block_1$3;
    		return create_else_block$3;
    	}

    	let current_block_type = select_block_type(ctx, -1);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			p = element("p");
    			if_block.c();
    			attr_dev(p, "class", "has-text-grey-light");
    			add_location(p, file$g, 11, 0, 243);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			if_block.m(p, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(p, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let date;
    	let sourceIsLink;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("LastUpdated", slots, []);
    	let { lastUpdated = "" } = $$props;
    	let { source = "" } = $$props;
    	const writable_props = ["lastUpdated", "source"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<LastUpdated> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("lastUpdated" in $$props) $$invalidate(3, lastUpdated = $$props.lastUpdated);
    		if ("source" in $$props) $$invalidate(0, source = $$props.source);
    	};

    	$$self.$capture_state = () => ({
    		getValidUrl,
    		lastUpdated,
    		source,
    		date,
    		sourceIsLink
    	});

    	$$self.$inject_state = $$props => {
    		if ("lastUpdated" in $$props) $$invalidate(3, lastUpdated = $$props.lastUpdated);
    		if ("source" in $$props) $$invalidate(0, source = $$props.source);
    		if ("date" in $$props) $$invalidate(1, date = $$props.date);
    		if ("sourceIsLink" in $$props) $$invalidate(2, sourceIsLink = $$props.sourceIsLink);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*lastUpdated*/ 8) {
    			 $$invalidate(1, date = new Date(lastUpdated).toLocaleString());
    		}

    		if ($$self.$$.dirty & /*source*/ 1) {
    			 $$invalidate(2, sourceIsLink = source.includes("http"));
    		}
    	};

    	return [source, date, sourceIsLink, lastUpdated];
    }

    class LastUpdated extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, { lastUpdated: 3, source: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LastUpdated",
    			options,
    			id: create_fragment$g.name
    		});
    	}

    	get lastUpdated() {
    		throw new Error("<LastUpdated>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lastUpdated(value) {
    		throw new Error("<LastUpdated>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get source() {
    		throw new Error("<LastUpdated>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set source(value) {
    		throw new Error("<LastUpdated>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/sidebar/details/Status.svelte generated by Svelte v3.35.0 */

    const file$h = "src/components/sidebar/details/Status.svelte";

    // (9:0) {:else}
    function create_else_block$4(ctx) {
    	let p;
    	let span;
    	let t_value = /*status*/ ctx[0].toUpperCase() + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "tag is-warning is-medium svelte-1wqnc2x");
    			add_location(span, file$h, 9, 7, 209);
    			add_location(p, file$h, 9, 4, 206);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, span);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*status*/ 1 && t_value !== (t_value = /*status*/ ctx[0].toUpperCase() + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$4.name,
    		type: "else",
    		source: "(9:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (7:0) {#if isOpened}
    function create_if_block$6(ctx) {
    	let p;
    	let span;
    	let t_value = /*status*/ ctx[0].toUpperCase() + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "tag is-success is-medium svelte-1wqnc2x");
    			add_location(span, file$h, 7, 7, 121);
    			add_location(p, file$h, 7, 4, 118);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, span);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*status*/ 1 && t_value !== (t_value = /*status*/ ctx[0].toUpperCase() + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(7:0) {#if isOpened}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$h(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*isOpened*/ ctx[1]) return create_if_block$6;
    		return create_else_block$4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let isOpened;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Status", slots, []);
    	let { status } = $$props;
    	const writable_props = ["status"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Status> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("status" in $$props) $$invalidate(0, status = $$props.status);
    	};

    	$$self.$capture_state = () => ({ status, isOpened });

    	$$self.$inject_state = $$props => {
    		if ("status" in $$props) $$invalidate(0, status = $$props.status);
    		if ("isOpened" in $$props) $$invalidate(1, isOpened = $$props.isOpened);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*status*/ 1) {
    			 $$invalidate(1, isOpened = status.toLowerCase().includes("open"));
    		}
    	};

    	return [status, isOpened];
    }

    class Status extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, { status: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Status",
    			options,
    			id: create_fragment$h.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*status*/ ctx[0] === undefined && !("status" in props)) {
    			console.warn("<Status> was created without expected prop 'status'");
    		}
    	}

    	get status() {
    		throw new Error("<Status>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set status(value) {
    		throw new Error("<Status>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/sidebar/details/ItemDetails.svelte generated by Svelte v3.35.0 */

    const { console: console_1$1 } = globals;
    const file$i = "src/components/sidebar/details/ItemDetails.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (63:8) {#if item['Library Name'] != item['Unit Name']}
    function create_if_block_7(ctx) {
    	let h3;
    	let t_value = /*item*/ ctx[0]["Unit Name"] + "";
    	let t;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t = text(t_value);
    			attr_dev(h3, "class", "is-5 subtitle is-marginless notranslate svelte-1vrcz2t");
    			attr_dev(h3, "translate", "no");
    			add_location(h3, file$i, 63, 8, 1875);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*item*/ 1 && t_value !== (t_value = /*item*/ ctx[0]["Unit Name"] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(63:8) {#if item['Library Name'] != item['Unit Name']}",
    		ctx
    	});

    	return block;
    }

    // (78:12) {#if subCategories.length}
    function create_if_block_6(ctx) {
    	let div;
    	let each_value = /*subCategories*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "tags are-small svelte-1vrcz2t");
    			add_location(div, file$i, 78, 16, 2458);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*subCategories*/ 2) {
    				each_value = /*subCategories*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(78:12) {#if subCategories.length}",
    		ctx
    	});

    	return block;
    }

    // (80:20) {#each subCategories as tag}
    function create_each_block$2(ctx) {
    	let span;
    	let t_value = /*tag*/ ctx[6] + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "tag svelte-1vrcz2t");
    			add_location(span, file$i, 80, 24, 2560);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*subCategories*/ 2 && t_value !== (t_value = /*tag*/ ctx[6] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(80:20) {#each subCategories as tag}",
    		ctx
    	});

    	return block;
    }

    // (104:8) {#if item['Social Media - Blog'] }
    function create_if_block_5(ctx) {
    	let itemdetailsinfo;
    	let current;

    	itemdetailsinfo = new ItemDetailsInfo({
    			props: {
    				url: /*item*/ ctx[0]["Social Media - Blog"],
    				text: " ",
    				icon: "blogger-b",
    				type: "website"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(itemdetailsinfo.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(itemdetailsinfo, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const itemdetailsinfo_changes = {};
    			if (dirty & /*item*/ 1) itemdetailsinfo_changes.url = /*item*/ ctx[0]["Social Media - Blog"];
    			itemdetailsinfo.$set(itemdetailsinfo_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemdetailsinfo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(itemdetailsinfo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(itemdetailsinfo, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(104:8) {#if item['Social Media - Blog'] }",
    		ctx
    	});

    	return block;
    }

    // (107:8) {#if item['Social Media - Twitter'] }
    function create_if_block_4(ctx) {
    	let itemdetailsinfo;
    	let current;

    	itemdetailsinfo = new ItemDetailsInfo({
    			props: {
    				url: /*item*/ ctx[0]["Social Media - Twitter"],
    				text: " ",
    				icon: "twitter",
    				type: "website"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(itemdetailsinfo.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(itemdetailsinfo, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const itemdetailsinfo_changes = {};
    			if (dirty & /*item*/ 1) itemdetailsinfo_changes.url = /*item*/ ctx[0]["Social Media - Twitter"];
    			itemdetailsinfo.$set(itemdetailsinfo_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemdetailsinfo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(itemdetailsinfo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(itemdetailsinfo, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(107:8) {#if item['Social Media - Twitter'] }",
    		ctx
    	});

    	return block;
    }

    // (110:8) {#if item['Social Media - Facebook'] }
    function create_if_block_3$1(ctx) {
    	let itemdetailsinfo;
    	let current;

    	itemdetailsinfo = new ItemDetailsInfo({
    			props: {
    				url: /*item*/ ctx[0]["Social Media - Facebook"],
    				text: " ",
    				icon: "facebook",
    				type: "website"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(itemdetailsinfo.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(itemdetailsinfo, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const itemdetailsinfo_changes = {};
    			if (dirty & /*item*/ 1) itemdetailsinfo_changes.url = /*item*/ ctx[0]["Social Media - Facebook"];
    			itemdetailsinfo.$set(itemdetailsinfo_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemdetailsinfo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(itemdetailsinfo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(itemdetailsinfo, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(110:8) {#if item['Social Media - Facebook'] }",
    		ctx
    	});

    	return block;
    }

    // (113:8) {#if item['Social Media - Instagram'] }
    function create_if_block_2$1(ctx) {
    	let itemdetailsinfo;
    	let current;

    	itemdetailsinfo = new ItemDetailsInfo({
    			props: {
    				url: /*item*/ ctx[0]["Social Media - Instagram"],
    				text: " ",
    				icon: "instagram",
    				type: "website"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(itemdetailsinfo.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(itemdetailsinfo, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const itemdetailsinfo_changes = {};
    			if (dirty & /*item*/ 1) itemdetailsinfo_changes.url = /*item*/ ctx[0]["Social Media - Instagram"];
    			itemdetailsinfo.$set(itemdetailsinfo_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemdetailsinfo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(itemdetailsinfo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(itemdetailsinfo, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(113:8) {#if item['Social Media - Instagram'] }",
    		ctx
    	});

    	return block;
    }

    // (116:8) {#if item['Social Media - YouTube'] }
    function create_if_block_1$4(ctx) {
    	let itemdetailsinfo;
    	let current;

    	itemdetailsinfo = new ItemDetailsInfo({
    			props: {
    				url: /*item*/ ctx[0]["Social Media - Youtube"],
    				text: " ",
    				icon: "youtube",
    				type: "website"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(itemdetailsinfo.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(itemdetailsinfo, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const itemdetailsinfo_changes = {};
    			if (dirty & /*item*/ 1) itemdetailsinfo_changes.url = /*item*/ ctx[0]["Social Media - Youtube"];
    			itemdetailsinfo.$set(itemdetailsinfo_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemdetailsinfo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(itemdetailsinfo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(itemdetailsinfo, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(116:8) {#if item['Social Media - YouTube'] }",
    		ctx
    	});

    	return block;
    }

    // (119:8) {#if item['Social Media - Other'] }
    function create_if_block$7(ctx) {
    	let itemdetailsinfo;
    	let current;

    	itemdetailsinfo = new ItemDetailsInfo({
    			props: {
    				url: /*item*/ ctx[0]["Social Media - Other"],
    				text: " ",
    				icon: "public",
    				icontype: "mdi",
    				type: "website"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(itemdetailsinfo.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(itemdetailsinfo, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const itemdetailsinfo_changes = {};
    			if (dirty & /*item*/ 1) itemdetailsinfo_changes.url = /*item*/ ctx[0]["Social Media - Other"];
    			itemdetailsinfo.$set(itemdetailsinfo_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemdetailsinfo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(itemdetailsinfo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(itemdetailsinfo, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(119:8) {#if item['Social Media - Other'] }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$i(ctx) {
    	let div3;
    	let div0;
    	let button;
    	let materialicon;
    	let t0;
    	let div2;
    	let h1;
    	let t1_value = /*item*/ ctx[0]["Institution Name"] + "";
    	let t1;
    	let t2;
    	let h2;
    	let t3_value = /*item*/ ctx[0]["Library Name"] + "";
    	let t3;
    	let t4;
    	let t5;
    	let br0;
    	let t6;
    	let div1;
    	let strong;
    	let t8;
    	let t9;
    	let t10;
    	let t11;
    	let t12;
    	let t13;
    	let t14;
    	let t15;
    	let h4;
    	let t17;
    	let markdownfield0;
    	let t18;
    	let markdownfield1;
    	let t19;
    	let markdownfield2;
    	let t20;
    	let markdownfield3;
    	let t21;
    	let br1;
    	let t22;
    	let markdownfield4;
    	let t23;
    	let markdownfield5;
    	let t24;
    	let br2;
    	let t25;
    	let markdownfield6;
    	let t26;
    	let markdownfield7;
    	let t27;
    	let markdownfield8;
    	let t28;
    	let hr;
    	let current;
    	let mounted;
    	let dispose;

    	materialicon = new MaterialIcon({
    			props: { icon: "keyboard_backspace" },
    			$$inline: true
    		});

    	let if_block0 = /*item*/ ctx[0]["Library Name"] != /*item*/ ctx[0]["Unit Name"] && create_if_block_7(ctx);
    	let if_block1 = /*subCategories*/ ctx[1].length && create_if_block_6(ctx);
    	let if_block2 = /*item*/ ctx[0]["Social Media - Blog"] && create_if_block_5(ctx);
    	let if_block3 = /*item*/ ctx[0]["Social Media - Twitter"] && create_if_block_4(ctx);
    	let if_block4 = /*item*/ ctx[0]["Social Media - Facebook"] && create_if_block_3$1(ctx);
    	let if_block5 = /*item*/ ctx[0]["Social Media - Instagram"] && create_if_block_2$1(ctx);
    	let if_block6 = /*item*/ ctx[0]["Social Media - YouTube"] && create_if_block_1$4(ctx);
    	let if_block7 = /*item*/ ctx[0]["Social Media - Other"] && create_if_block$7(ctx);

    	markdownfield0 = new MarkdownField({
    			props: {
    				title: "Name",
    				content: /*item*/ ctx[0]["Contact Name"],
    				type: "notitle"
    			},
    			$$inline: true
    		});

    	markdownfield1 = new MarkdownField({
    			props: {
    				title: "Title",
    				content: /*item*/ ctx[0]["Contact Title"],
    				type: "notitle"
    			},
    			$$inline: true
    		});

    	markdownfield2 = new MarkdownField({
    			props: {
    				title: "Phone",
    				content: /*item*/ ctx[0]["Contact Phone"],
    				type: "notitle"
    			},
    			$$inline: true
    		});

    	markdownfield3 = new MarkdownField({
    			props: {
    				title: "Email",
    				content: /*item*/ ctx[0]["Contact Email"],
    				type: "notitle"
    			},
    			$$inline: true
    		});

    	markdownfield4 = new MarkdownField({
    			props: {
    				title: "Location",
    				content: /*item*/ ctx[0].Location
    			},
    			$$inline: true
    		});

    	markdownfield5 = new MarkdownField({
    			props: {
    				title: "Established Year",
    				content: /*item*/ ctx[0]["Established Year"]
    			},
    			$$inline: true
    		});

    	markdownfield6 = new MarkdownField({
    			props: {
    				title: "Program Overview",
    				content: /*item*/ ctx[0]["Program Overview"]
    			},
    			$$inline: true
    		});

    	markdownfield7 = new MarkdownField({
    			props: {
    				title: "Hours",
    				content: /*item*/ ctx[0].Hours
    			},
    			$$inline: true
    		});

    	markdownfield8 = new MarkdownField({
    			props: {
    				title: "Special Accommodation Hours",
    				content: /*item*/ ctx[0]["Special Accommodation Hours"]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			button = element("button");
    			create_component(materialicon.$$.fragment);
    			t0 = space();
    			div2 = element("div");
    			h1 = element("h1");
    			t1 = text(t1_value);
    			t2 = space();
    			h2 = element("h2");
    			t3 = text(t3_value);
    			t4 = space();
    			if (if_block0) if_block0.c();
    			t5 = space();
    			br0 = element("br");
    			t6 = space();
    			div1 = element("div");
    			strong = element("strong");
    			strong.textContent = "Types of Libraries -";
    			t8 = space();
    			if (if_block1) if_block1.c();
    			t9 = space();
    			if (if_block2) if_block2.c();
    			t10 = space();
    			if (if_block3) if_block3.c();
    			t11 = space();
    			if (if_block4) if_block4.c();
    			t12 = space();
    			if (if_block5) if_block5.c();
    			t13 = space();
    			if (if_block6) if_block6.c();
    			t14 = space();
    			if (if_block7) if_block7.c();
    			t15 = space();
    			h4 = element("h4");
    			h4.textContent = "Contact:";
    			t17 = space();
    			create_component(markdownfield0.$$.fragment);
    			t18 = space();
    			create_component(markdownfield1.$$.fragment);
    			t19 = space();
    			create_component(markdownfield2.$$.fragment);
    			t20 = space();
    			create_component(markdownfield3.$$.fragment);
    			t21 = space();
    			br1 = element("br");
    			t22 = space();
    			create_component(markdownfield4.$$.fragment);
    			t23 = space();
    			create_component(markdownfield5.$$.fragment);
    			t24 = space();
    			br2 = element("br");
    			t25 = space();
    			create_component(markdownfield6.$$.fragment);
    			t26 = space();
    			create_component(markdownfield7.$$.fragment);
    			t27 = space();
    			create_component(markdownfield8.$$.fragment);
    			t28 = space();
    			hr = element("hr");
    			attr_dev(button, "class", "button is-small back svelte-1vrcz2t");
    			add_location(button, file$i, 54, 8, 1370);
    			attr_dev(div0, "class", "header svelte-1vrcz2t");
    			add_location(div0, file$i, 53, 4, 1341);
    			attr_dev(h1, "class", "is-5 subtitle is-marginless notranslate svelte-1vrcz2t");
    			attr_dev(h1, "translate", "no");
    			add_location(h1, file$i, 60, 8, 1609);
    			attr_dev(h2, "class", "is-5 subtitle is-marginless notranslate svelte-1vrcz2t");
    			attr_dev(h2, "translate", "no");
    			add_location(h2, file$i, 61, 8, 1716);
    			attr_dev(br0, "class", "svelte-1vrcz2t");
    			add_location(br0, file$i, 74, 8, 2314);
    			attr_dev(strong, "class", "svelte-1vrcz2t");
    			add_location(strong, file$i, 76, 12, 2364);
    			attr_dev(div1, "class", "category svelte-1vrcz2t");
    			add_location(div1, file$i, 75, 8, 2329);
    			attr_dev(h4, "class", "is-5 subtitle is-marginless notranslate svelte-1vrcz2t");
    			attr_dev(h4, "translate", "no");
    			add_location(h4, file$i, 123, 8, 4414);
    			attr_dev(br1, "class", "svelte-1vrcz2t");
    			add_location(br1, file$i, 129, 8, 4849);
    			attr_dev(br2, "class", "svelte-1vrcz2t");
    			add_location(br2, file$i, 133, 8, 5017);
    			attr_dev(hr, "class", "svelte-1vrcz2t");
    			add_location(hr, file$i, 139, 8, 5352);
    			attr_dev(div2, "class", "content svelte-1vrcz2t");
    			add_location(div2, file$i, 59, 4, 1579);
    			attr_dev(div3, "class", "details svelte-1vrcz2t");
    			add_location(div3, file$i, 52, 0, 1315);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, button);
    			mount_component(materialicon, button, null);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, h1);
    			append_dev(h1, t1);
    			append_dev(div2, t2);
    			append_dev(div2, h2);
    			append_dev(h2, t3);
    			append_dev(div2, t4);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(div2, t5);
    			append_dev(div2, br0);
    			append_dev(div2, t6);
    			append_dev(div2, div1);
    			append_dev(div1, strong);
    			append_dev(div1, t8);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div2, t9);
    			if (if_block2) if_block2.m(div2, null);
    			append_dev(div2, t10);
    			if (if_block3) if_block3.m(div2, null);
    			append_dev(div2, t11);
    			if (if_block4) if_block4.m(div2, null);
    			append_dev(div2, t12);
    			if (if_block5) if_block5.m(div2, null);
    			append_dev(div2, t13);
    			if (if_block6) if_block6.m(div2, null);
    			append_dev(div2, t14);
    			if (if_block7) if_block7.m(div2, null);
    			append_dev(div2, t15);
    			append_dev(div2, h4);
    			append_dev(div2, t17);
    			mount_component(markdownfield0, div2, null);
    			append_dev(div2, t18);
    			mount_component(markdownfield1, div2, null);
    			append_dev(div2, t19);
    			mount_component(markdownfield2, div2, null);
    			append_dev(div2, t20);
    			mount_component(markdownfield3, div2, null);
    			append_dev(div2, t21);
    			append_dev(div2, br1);
    			append_dev(div2, t22);
    			mount_component(markdownfield4, div2, null);
    			append_dev(div2, t23);
    			mount_component(markdownfield5, div2, null);
    			append_dev(div2, t24);
    			append_dev(div2, br2);
    			append_dev(div2, t25);
    			mount_component(markdownfield6, div2, null);
    			append_dev(div2, t26);
    			mount_component(markdownfield7, div2, null);
    			append_dev(div2, t27);
    			mount_component(markdownfield8, div2, null);
    			append_dev(div2, t28);
    			append_dev(div2, hr);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*resetSelect*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*item*/ 1) && t1_value !== (t1_value = /*item*/ ctx[0]["Institution Name"] + "")) set_data_dev(t1, t1_value);
    			if ((!current || dirty & /*item*/ 1) && t3_value !== (t3_value = /*item*/ ctx[0]["Library Name"] + "")) set_data_dev(t3, t3_value);

    			if (/*item*/ ctx[0]["Library Name"] != /*item*/ ctx[0]["Unit Name"]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_7(ctx);
    					if_block0.c();
    					if_block0.m(div2, t5);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*subCategories*/ ctx[1].length) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_6(ctx);
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*item*/ ctx[0]["Social Media - Blog"]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*item*/ 1) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_5(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div2, t10);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*item*/ ctx[0]["Social Media - Twitter"]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty & /*item*/ 1) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block_4(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(div2, t11);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if (/*item*/ ctx[0]["Social Media - Facebook"]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);

    					if (dirty & /*item*/ 1) {
    						transition_in(if_block4, 1);
    					}
    				} else {
    					if_block4 = create_if_block_3$1(ctx);
    					if_block4.c();
    					transition_in(if_block4, 1);
    					if_block4.m(div2, t12);
    				}
    			} else if (if_block4) {
    				group_outros();

    				transition_out(if_block4, 1, 1, () => {
    					if_block4 = null;
    				});

    				check_outros();
    			}

    			if (/*item*/ ctx[0]["Social Media - Instagram"]) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);

    					if (dirty & /*item*/ 1) {
    						transition_in(if_block5, 1);
    					}
    				} else {
    					if_block5 = create_if_block_2$1(ctx);
    					if_block5.c();
    					transition_in(if_block5, 1);
    					if_block5.m(div2, t13);
    				}
    			} else if (if_block5) {
    				group_outros();

    				transition_out(if_block5, 1, 1, () => {
    					if_block5 = null;
    				});

    				check_outros();
    			}

    			if (/*item*/ ctx[0]["Social Media - YouTube"]) {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);

    					if (dirty & /*item*/ 1) {
    						transition_in(if_block6, 1);
    					}
    				} else {
    					if_block6 = create_if_block_1$4(ctx);
    					if_block6.c();
    					transition_in(if_block6, 1);
    					if_block6.m(div2, t14);
    				}
    			} else if (if_block6) {
    				group_outros();

    				transition_out(if_block6, 1, 1, () => {
    					if_block6 = null;
    				});

    				check_outros();
    			}

    			if (/*item*/ ctx[0]["Social Media - Other"]) {
    				if (if_block7) {
    					if_block7.p(ctx, dirty);

    					if (dirty & /*item*/ 1) {
    						transition_in(if_block7, 1);
    					}
    				} else {
    					if_block7 = create_if_block$7(ctx);
    					if_block7.c();
    					transition_in(if_block7, 1);
    					if_block7.m(div2, t15);
    				}
    			} else if (if_block7) {
    				group_outros();

    				transition_out(if_block7, 1, 1, () => {
    					if_block7 = null;
    				});

    				check_outros();
    			}

    			const markdownfield0_changes = {};
    			if (dirty & /*item*/ 1) markdownfield0_changes.content = /*item*/ ctx[0]["Contact Name"];
    			markdownfield0.$set(markdownfield0_changes);
    			const markdownfield1_changes = {};
    			if (dirty & /*item*/ 1) markdownfield1_changes.content = /*item*/ ctx[0]["Contact Title"];
    			markdownfield1.$set(markdownfield1_changes);
    			const markdownfield2_changes = {};
    			if (dirty & /*item*/ 1) markdownfield2_changes.content = /*item*/ ctx[0]["Contact Phone"];
    			markdownfield2.$set(markdownfield2_changes);
    			const markdownfield3_changes = {};
    			if (dirty & /*item*/ 1) markdownfield3_changes.content = /*item*/ ctx[0]["Contact Email"];
    			markdownfield3.$set(markdownfield3_changes);
    			const markdownfield4_changes = {};
    			if (dirty & /*item*/ 1) markdownfield4_changes.content = /*item*/ ctx[0].Location;
    			markdownfield4.$set(markdownfield4_changes);
    			const markdownfield5_changes = {};
    			if (dirty & /*item*/ 1) markdownfield5_changes.content = /*item*/ ctx[0]["Established Year"];
    			markdownfield5.$set(markdownfield5_changes);
    			const markdownfield6_changes = {};
    			if (dirty & /*item*/ 1) markdownfield6_changes.content = /*item*/ ctx[0]["Program Overview"];
    			markdownfield6.$set(markdownfield6_changes);
    			const markdownfield7_changes = {};
    			if (dirty & /*item*/ 1) markdownfield7_changes.content = /*item*/ ctx[0].Hours;
    			markdownfield7.$set(markdownfield7_changes);
    			const markdownfield8_changes = {};
    			if (dirty & /*item*/ 1) markdownfield8_changes.content = /*item*/ ctx[0]["Special Accommodation Hours"];
    			markdownfield8.$set(markdownfield8_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(materialicon.$$.fragment, local);
    			transition_in(if_block2);
    			transition_in(if_block3);
    			transition_in(if_block4);
    			transition_in(if_block5);
    			transition_in(if_block6);
    			transition_in(if_block7);
    			transition_in(markdownfield0.$$.fragment, local);
    			transition_in(markdownfield1.$$.fragment, local);
    			transition_in(markdownfield2.$$.fragment, local);
    			transition_in(markdownfield3.$$.fragment, local);
    			transition_in(markdownfield4.$$.fragment, local);
    			transition_in(markdownfield5.$$.fragment, local);
    			transition_in(markdownfield6.$$.fragment, local);
    			transition_in(markdownfield7.$$.fragment, local);
    			transition_in(markdownfield8.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(materialicon.$$.fragment, local);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			transition_out(if_block4);
    			transition_out(if_block5);
    			transition_out(if_block6);
    			transition_out(if_block7);
    			transition_out(markdownfield0.$$.fragment, local);
    			transition_out(markdownfield1.$$.fragment, local);
    			transition_out(markdownfield2.$$.fragment, local);
    			transition_out(markdownfield3.$$.fragment, local);
    			transition_out(markdownfield4.$$.fragment, local);
    			transition_out(markdownfield5.$$.fragment, local);
    			transition_out(markdownfield6.$$.fragment, local);
    			transition_out(markdownfield7.$$.fragment, local);
    			transition_out(markdownfield8.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_component(materialicon);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    			if (if_block7) if_block7.d();
    			destroy_component(markdownfield0);
    			destroy_component(markdownfield1);
    			destroy_component(markdownfield2);
    			destroy_component(markdownfield3);
    			destroy_component(markdownfield4);
    			destroy_component(markdownfield5);
    			destroy_component(markdownfield6);
    			destroy_component(markdownfield7);
    			destroy_component(markdownfield8);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let item;
    	let location;
    	let estYear;
    	let $selectedItem;
    	validate_store(selectedItem, "selectedItem");
    	component_subscribe($$self, selectedItem, $$value => $$invalidate(3, $selectedItem = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ItemDetails", slots, []);
    	console.log($selectedItem);
    	let subCategories = [];

    	function resetSelect() {
    		selectedItem.select(null);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<ItemDetails> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		selectedItem,
    		MarkdownField,
    		ItemDetailsInfo,
    		PickupDelivery,
    		LastUpdated,
    		Status,
    		MaterialIcon,
    		subCategories,
    		resetSelect,
    		item,
    		$selectedItem,
    		location,
    		estYear
    	});

    	$$self.$inject_state = $$props => {
    		if ("subCategories" in $$props) $$invalidate(1, subCategories = $$props.subCategories);
    		if ("item" in $$props) $$invalidate(0, item = $$props.item);
    		if ("location" in $$props) location = $$props.location;
    		if ("estYear" in $$props) estYear = $$props.estYear;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$selectedItem*/ 8) {
    			 $$invalidate(0, item = $selectedItem);
    		}

    		if ($$self.$$.dirty & /*item*/ 1) {
    			 if (item) $$invalidate(1, subCategories = item["Sub-Category"].split(",").filter(tag => tag.trim()));
    		}

    		if ($$self.$$.dirty & /*item*/ 1) {
    			 location = item["Location"].trim().length;
    		}

    		if ($$self.$$.dirty & /*item*/ 1) {
    			 estYear = item["Established Year"].trim().length;
    		}
    	};

    	return [item, subCategories, resetSelect, $selectedItem];
    }

    class ItemDetails extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ItemDetails",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    /* src/components/Sidebar.svelte generated by Svelte v3.35.0 */
    const file$j = "src/components/Sidebar.svelte";

    // (16:8) {#if $selectedItem}
    function create_if_block$8(ctx) {
    	let itemdetails;
    	let current;
    	itemdetails = new ItemDetails({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(itemdetails.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(itemdetails, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemdetails.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(itemdetails.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(itemdetails, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$8.name,
    		type: "if",
    		source: "(16:8) {#if $selectedItem}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$j(ctx) {
    	let div2;
    	let div0;
    	let namesearch;
    	let t0;
    	let div1;
    	let rowitems;
    	let t1;
    	let current;
    	namesearch = new NameSearch({ $$inline: true });

    	rowitems = new RowItems({
    			props: {
    				items: /*items*/ ctx[0],
    				show: !/*$selectedItem*/ ctx[1]
    			},
    			$$inline: true
    		});

    	let if_block = /*$selectedItem*/ ctx[1] && create_if_block$8(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			create_component(namesearch.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			create_component(rowitems.$$.fragment);
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "search");
    			add_location(div0, file$j, 10, 4, 309);
    			attr_dev(div1, "class", "items svelte-16l6jxp");
    			add_location(div1, file$j, 13, 4, 367);
    			attr_dev(div2, "class", "sidebar-content svelte-16l6jxp");
    			add_location(div2, file$j, 9, 0, 275);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			mount_component(namesearch, div0, null);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			mount_component(rowitems, div1, null);
    			append_dev(div1, t1);
    			if (if_block) if_block.m(div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const rowitems_changes = {};
    			if (dirty & /*items*/ 1) rowitems_changes.items = /*items*/ ctx[0];
    			if (dirty & /*$selectedItem*/ 2) rowitems_changes.show = !/*$selectedItem*/ ctx[1];
    			rowitems.$set(rowitems_changes);

    			if (/*$selectedItem*/ ctx[1]) {
    				if (if_block) {
    					if (dirty & /*$selectedItem*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$8(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(namesearch.$$.fragment, local);
    			transition_in(rowitems.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(namesearch.$$.fragment, local);
    			transition_out(rowitems.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(namesearch);
    			destroy_component(rowitems);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let $selectedItem;
    	validate_store(selectedItem, "selectedItem");
    	component_subscribe($$self, selectedItem, $$value => $$invalidate(1, $selectedItem = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Sidebar", slots, []);
    	let { items = [] } = $$props;
    	const writable_props = ["items"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Sidebar> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    	};

    	$$self.$capture_state = () => ({
    		selectedItem,
    		NameSearch,
    		RowItems,
    		ItemDetails,
    		items,
    		$selectedItem
    	});

    	$$self.$inject_state = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [items, $selectedItem];
    }

    class Sidebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, { items: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sidebar",
    			options,
    			id: create_fragment$j.name
    		});
    	}

    	get items() {
    		throw new Error("<Sidebar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<Sidebar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/TopButton.svelte generated by Svelte v3.35.0 */
    const file$k = "src/components/TopButton.svelte";

    // (15:0) {#if scrollY + innerHeight > document.body.offsetHeight + 15}
    function create_if_block$9(ctx) {
    	let button;
    	let materialicon;
    	let current;
    	let mounted;
    	let dispose;

    	materialicon = new MaterialIcon({
    			props: { icon: "keyboard_arrow_up" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			button = element("button");
    			create_component(materialicon.$$.fragment);
    			attr_dev(button, "class", "button is-rounded svelte-1x9ej4s");
    			add_location(button, file$k, 15, 4, 367);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			mount_component(materialicon, button, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", scrollTop, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(materialicon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(materialicon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			destroy_component(materialicon);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$9.name,
    		type: "if",
    		source: "(15:0) {#if scrollY + innerHeight > document.body.offsetHeight + 15}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$k(ctx) {
    	let scrolling = false;

    	let clear_scrolling = () => {
    		scrolling = false;
    	};

    	let scrolling_timeout;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[2]);
    	add_render_callback(/*onwindowresize*/ ctx[3]);
    	let if_block = /*scrollY*/ ctx[0] + /*innerHeight*/ ctx[1] > document.body.offsetHeight + 15 && create_if_block$9(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[2]();
    					}),
    					listen_dev(window, "resize", /*onwindowresize*/ ctx[3])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*scrollY*/ 1 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, /*scrollY*/ ctx[0]);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			if (/*scrollY*/ ctx[0] + /*innerHeight*/ ctx[1] > document.body.offsetHeight + 15) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*scrollY, innerHeight*/ 3) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$9(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function scrollTop() {
    	document.body.scrollTop = 0;
    	document.documentElement.scrollTop = 0;
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TopButton", slots, []);
    	let scrollY;
    	let innerHeight;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TopButton> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, scrollY = window.pageYOffset);
    	}

    	function onwindowresize() {
    		$$invalidate(1, innerHeight = window.innerHeight);
    	}

    	$$self.$capture_state = () => ({
    		MaterialIcon,
    		scrollY,
    		innerHeight,
    		scrollTop
    	});

    	$$self.$inject_state = $$props => {
    		if ("scrollY" in $$props) $$invalidate(0, scrollY = $$props.scrollY);
    		if ("innerHeight" in $$props) $$invalidate(1, innerHeight = $$props.innerHeight);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [scrollY, innerHeight, onwindowscroll, onwindowresize];
    }

    class TopButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TopButton",
    			options,
    			id: create_fragment$k.name
    		});
    	}
    }

    var EOL = {},
        EOF = {},
        QUOTE = 34,
        NEWLINE = 10,
        RETURN = 13;

    function objectConverter(columns) {
      return new Function("d", "return {" + columns.map(function(name, i) {
        return JSON.stringify(name) + ": d[" + i + "] || \"\"";
      }).join(",") + "}");
    }

    function customConverter(columns, f) {
      var object = objectConverter(columns);
      return function(row, i) {
        return f(object(row), i, columns);
      };
    }

    // Compute unique columns in order of discovery.
    function inferColumns(rows) {
      var columnSet = Object.create(null),
          columns = [];

      rows.forEach(function(row) {
        for (var column in row) {
          if (!(column in columnSet)) {
            columns.push(columnSet[column] = column);
          }
        }
      });

      return columns;
    }

    function pad(value, width) {
      var s = value + "", length = s.length;
      return length < width ? new Array(width - length + 1).join(0) + s : s;
    }

    function formatYear(year) {
      return year < 0 ? "-" + pad(-year, 6)
        : year > 9999 ? "+" + pad(year, 6)
        : pad(year, 4);
    }

    function formatDate(date) {
      var hours = date.getUTCHours(),
          minutes = date.getUTCMinutes(),
          seconds = date.getUTCSeconds(),
          milliseconds = date.getUTCMilliseconds();
      return isNaN(date) ? "Invalid Date"
          : formatYear(date.getUTCFullYear()) + "-" + pad(date.getUTCMonth() + 1, 2) + "-" + pad(date.getUTCDate(), 2)
          + (milliseconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "." + pad(milliseconds, 3) + "Z"
          : seconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "Z"
          : minutes || hours ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + "Z"
          : "");
    }

    function dsv(delimiter) {
      var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
          DELIMITER = delimiter.charCodeAt(0);

      function parse(text, f) {
        var convert, columns, rows = parseRows(text, function(row, i) {
          if (convert) return convert(row, i - 1);
          columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
        });
        rows.columns = columns || [];
        return rows;
      }

      function parseRows(text, f) {
        var rows = [], // output rows
            N = text.length,
            I = 0, // current character index
            n = 0, // current line number
            t, // current token
            eof = N <= 0, // current token followed by EOF?
            eol = false; // current token followed by EOL?

        // Strip the trailing newline.
        if (text.charCodeAt(N - 1) === NEWLINE) --N;
        if (text.charCodeAt(N - 1) === RETURN) --N;

        function token() {
          if (eof) return EOF;
          if (eol) return eol = false, EOL;

          // Unescape quotes.
          var i, j = I, c;
          if (text.charCodeAt(j) === QUOTE) {
            while (I++ < N && text.charCodeAt(I) !== QUOTE || text.charCodeAt(++I) === QUOTE);
            if ((i = I) >= N) eof = true;
            else if ((c = text.charCodeAt(I++)) === NEWLINE) eol = true;
            else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
            return text.slice(j + 1, i - 1).replace(/""/g, "\"");
          }

          // Find next delimiter or newline.
          while (I < N) {
            if ((c = text.charCodeAt(i = I++)) === NEWLINE) eol = true;
            else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
            else if (c !== DELIMITER) continue;
            return text.slice(j, i);
          }

          // Return last token before EOF.
          return eof = true, text.slice(j, N);
        }

        while ((t = token()) !== EOF) {
          var row = [];
          while (t !== EOL && t !== EOF) row.push(t), t = token();
          if (f && (row = f(row, n++)) == null) continue;
          rows.push(row);
        }

        return rows;
      }

      function preformatBody(rows, columns) {
        return rows.map(function(row) {
          return columns.map(function(column) {
            return formatValue(row[column]);
          }).join(delimiter);
        });
      }

      function format(rows, columns) {
        if (columns == null) columns = inferColumns(rows);
        return [columns.map(formatValue).join(delimiter)].concat(preformatBody(rows, columns)).join("\n");
      }

      function formatBody(rows, columns) {
        if (columns == null) columns = inferColumns(rows);
        return preformatBody(rows, columns).join("\n");
      }

      function formatRows(rows) {
        return rows.map(formatRow).join("\n");
      }

      function formatRow(row) {
        return row.map(formatValue).join(delimiter);
      }

      function formatValue(value) {
        return value == null ? ""
            : value instanceof Date ? formatDate(value)
            : reFormat.test(value += "") ? "\"" + value.replace(/"/g, "\"\"") + "\""
            : value;
      }

      return {
        parse: parse,
        parseRows: parseRows,
        format: format,
        formatBody: formatBody,
        formatRows: formatRows,
        formatRow: formatRow,
        formatValue: formatValue
      };
    }

    var csv = dsv(",");

    var csvParse = csv.parse;

    function getColors(rows) {
        //get colors and icons from constants
        return rows.map(row => {
            const subLookup = styles.find(style => {
                const subCategory = row['Sub-Category'].toLowerCase().trim();
                if(subCategory.length === 0 || !style.subcategoryName){
                    return false
                }
                return style.categoryName === row.Category && subCategory.includes(style.subcategoryName)
            });
            const lookup = styles.find(style => style.categoryName === row.Category);

            //defaults
            let fillColor = '#909090',
                strokeColor = '#e8e8e8',
                icon = 'blank.png',
                _closed = !row.Status.toLowerCase().includes('open');

            if (subLookup) {
                fillColor = subLookup.fillColor;
                strokeColor = subLookup.strokeColor;
                icon = subLookup.icon;
            } else if (lookup) {
                //const [group, category, subCategory, fillColor, strokeColor, icon] = lookup
                fillColor = lookup.fillColor;
                strokeColor = lookup.strokeColor;
                icon = lookup.icon;
            }

            return {...row, fillColor, strokeColor, icon, _closed}
        })
    }

    function removeOverlap(rows) {
        //create coordinates array
        const coordRows = rows.map(row => {
            const digits = 4;
            const lng = +(+row.Longitude).toFixed(digits);
            const lat = +(+row.Latitude).toFixed(digits);
            const temp = [lng, lat];
            const coordinates = [+row.Longitude, +row.Latitude];
            return {...row, coordinates, temp}
        });
        //find overlapped lnglat and move them slightly depending on order
        return coordRows.map(row => {
            const [lng1, lat1] = row.temp;
            const overlapped = coordRows.filter(otherRow => {
                const [lng2, lat2] = otherRow.temp;
                return lat1 === lat2 && lng1 === lng2
            });
            if (overlapped.length > 1) {
                //move depending on the index
                const index = overlapped.indexOf(row);
                row.coordinates = [lng1 + index * 0.00003, lat1 + index * 0.00004];
            }
            return row
        })
    }

    function sortByAlphabet(rows) {
        return rows.sort((a,b) => a.Name.localeCompare(b.Name))
    }

    async function importData(file, store) {
        const text = await (await fetch(file)).text();
        const rows = csvParse(text);
        //filter for rows with latlng
        const filterRows = rows.filter(({Latitude, Longitude}) => +Latitude && +Longitude);

        console.log(`Imported ${filterRows.length} out of ${rows.length}. Check latlng columns, if there are missing rows.`, rows[0]);

        store.set(sortByAlphabet(removeOverlap(getColors(filterRows))));
    }

    /* src/App.svelte generated by Svelte v3.35.0 */
    const file$l = "src/App.svelte";

    function create_fragment$l(ctx) {
    	let main;
    	let header;
    	let t0;
    	let div2;
    	let div0;
    	let sidebar;
    	let t1;
    	let div1;
    	let mapview;
    	let t2;
    	let footer;
    	let t3;
    	let topbutton;
    	let current;
    	header = new Header({ $$inline: true });

    	sidebar = new Sidebar({
    			props: { items: /*items*/ ctx[0] },
    			$$inline: true
    		});

    	mapview = new MapView({ $$inline: true });
    	footer = new Footer({ $$inline: true });
    	topbutton = new TopButton({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(header.$$.fragment);
    			t0 = space();
    			div2 = element("div");
    			div0 = element("div");
    			create_component(sidebar.$$.fragment);
    			t1 = space();
    			div1 = element("div");
    			create_component(mapview.$$.fragment);
    			t2 = space();
    			create_component(footer.$$.fragment);
    			t3 = space();
    			create_component(topbutton.$$.fragment);
    			attr_dev(div0, "class", "sidebar svelte-w0kb");
    			add_location(div0, file$l, 23, 8, 616);
    			attr_dev(div1, "class", "map svelte-w0kb");
    			add_location(div1, file$l, 26, 8, 692);
    			attr_dev(div2, "class", "content svelte-w0kb");
    			add_location(div2, file$l, 22, 4, 586);
    			attr_dev(main, "class", "svelte-w0kb");
    			add_location(main, file$l, 20, 0, 561);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t0);
    			append_dev(main, div2);
    			append_dev(div2, div0);
    			mount_component(sidebar, div0, null);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			mount_component(mapview, div1, null);
    			append_dev(main, t2);
    			mount_component(footer, main, null);
    			insert_dev(target, t3, anchor);
    			mount_component(topbutton, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const sidebar_changes = {};
    			if (dirty & /*items*/ 1) sidebar_changes.items = /*items*/ ctx[0];
    			sidebar.$set(sidebar_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(sidebar.$$.fragment, local);
    			transition_in(mapview.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			transition_in(topbutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(sidebar.$$.fragment, local);
    			transition_out(mapview.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			transition_out(topbutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			destroy_component(sidebar);
    			destroy_component(mapview);
    			destroy_component(footer);
    			if (detaching) detach_dev(t3);
    			destroy_component(topbutton, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let items;
    	let $rows;
    	let $filters;
    	validate_store(rows, "rows");
    	component_subscribe($$self, rows, $$value => $$invalidate(1, $rows = $$value));
    	validate_store(filters, "filters");
    	component_subscribe($$self, filters, $$value => $$invalidate(2, $filters = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);

    	onMount(() => {
    		importData("data/rows.csv", rows);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Header,
    		Footer,
    		MapView,
    		Sidebar,
    		TopButton,
    		rows,
    		filters,
    		onMount,
    		importData,
    		items,
    		$rows,
    		$filters
    	});

    	$$self.$inject_state = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$rows, $filters*/ 6) {
    			 $$invalidate(0, items = $rows.filter(row => $filters.every(f => f.filter(row))));
    		}
    	};

    	return [items, $rows, $filters];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$l.name
    		});
    	}
    }

    //

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=main.js.map
