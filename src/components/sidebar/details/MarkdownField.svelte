<script>
    import marked from 'marked';
    import DOMPurify from 'dompurify'

    export let title = ''
    export let content = ''
    export let type='type'
    $: isEmpty = !content || content.trim().length === 0

</script>

{#if !isEmpty}
   {#if type == "notitle"}
    <span>{@html DOMPurify.sanitize(marked(content))}</span>
   {:else}
    <span><strong>{title}: </strong>{@html DOMPurify.sanitize(marked(content))}</span>
   {/if}
{/if}
