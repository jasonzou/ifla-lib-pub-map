<script>
    import MaterialIcon from './MaterialIcon.svelte'

    let innerWidth
    let opened = true;

</script>

<svelte:window bind:innerWidth={innerWidth}/>

<header>
    {#if innerWidth > 768}
        <div class="header-bar">
            <a class="is-1" href="https://www.ifla.org"><img src="images/logo.png" alt="IFLA logo" /></a>
            <h1 class="title is-3" id="title">Library Publishing Map of the World</h1>
            <a class="is-3" href="https://www.ifla.org/library-publishing"><img src="images/ifla95.png" alt="IFLA Library Publishing SIG logo" /></a>
        </div>
    {:else}
        <div class="header-bar">
            <a class="is-1" href="https://www.ifla.org"><img src="images/logo.png" alt="IFLA logo" /></a>
            <h1 class="title is-5" id="title">Library Publishing Map of the World</h1>
            <a class="is-5" href="https://www.ifla.org/library-publishing"><img src="images/ifla95.png" alt="IFLA Library Publishing SIG logo" /></a>
        </div>
    {/if}
</header>

<style>
    .header-bar {
        margin: 1rem 0rem;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: space-between;
    }

    .title {
        margin-bottom: 10px !important;
    }

    .has-background-warning{
        padding: 0.2rem 1rem ;
    }

    @media only screen and (max-width: 768px) {

        #subtitle {
            margin-top: 5px;
            background-color: #eaeaea;
            padding: 1rem 2rem;
            z-index: 2;
        }
    }

    .is-clicked {
        background-color: #ecf1f8;
    }

    p {
        margin-bottom: 0.25rem !important;
    }
</style>
