<script>
    import {selectedItem, mapObject} from '../../stores'
    import MaterialIcon from '../MaterialIcon.svelte'

    export let item

    function selectItem(item) {
        selectedItem.select(item, $mapObject, item.coordinates)
    }

    $: socialBlog = item['Social Media - Blog'].trim().length
    $: socialMedia= item['Social Media - Facebook'].trim().length
    $: website = item['Website'].trim().length
    $: email = item['Email'].trim().length
    $: location = item['Location'].trim().length
    $: estYear= item['Established Year'].trim().length
</script>

<div class="item">
    <a class="link" role="listitem" href="#" on:click={() => selectItem(item)}>
        <p class="is-6 subtitle is-marginless notranslate" translate="no"><strong>{item['Institution Name']}</strong></p>
        <p class="is-6 subtitle is-marginless notranslate" translate="no">{item['Library Name']}</p>
        {#if location}
        <p class="is-6 subtitle is-marginless notranslate" translate="no">{item.Location}</p>
        {/if}
        {#if estYear}
        <p class="is-6 subtitle is-marginless notranslate" translate="no">Est. {item['Established Year']}</p>
        {/if}
    </a>
    <!-- img class="category-icon" src="./icons/{typeLibrary.icon}" style="opacity: {item._closed ? 0.5 : 1}"/ -->
</div>

<style>
    a {
        color: #0e0e0e;
        text-decoration: none;
        display: block;

    }

    .item {
        position: relative;
        width: 100%;
    }

    .link {
        padding: 10px 10px;
        text-decoration: none;
        border-bottom: 1px solid rgba(170, 170, 170);
    }

    .category-icon {
        position: absolute;
        right: 10px;
        top: 10px;
        width: 24px;
        height: 28px;
    }

    .icons {
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        font-size: 1.2rem;
    }

    a:hover, a:focus {
        background-color: #ecf1f8;
    }

    a:focus{
        border: 1px dotted #8e8e90;
        border-bottom: none;
    }
</style>
