//
// This is the about js.
//

import About from './About.svelte';

import '@bulma/css/bulma.css';

const app = new About({
	target: document.body,
  props: {
    name: "About",
  },
});

export default app;
