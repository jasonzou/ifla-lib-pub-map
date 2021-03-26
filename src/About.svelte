<script>
    import Header from './components/Header.svelte'
    import Footer from './components/Footer.svelte'
    export let name;
</script>

<main>
    <Header/>
    <div class="content">
       <h1>About</h1>
       <div>ffdjsklkljdsfkjldsfkjdfsajkdfasjkldfsjkldfsajkdsla</div>
    <Footer/>
</main>

<style>
    main {
        display: flex;
        flex-direction: column;
        height: 98vh;
        margin: 0px auto;
        max-width: 1500px;
        color: #444;
        padding: 0px 25px;
    }

    main > * {
        flex: 1;
    }

    .content {
        margin: 1rem 0rem;
        display: flex;
        flex-wrap: wrap;
    }

    @media only screen and (max-width: 768px) {
        main {
            padding: 0 30px;
        }

        .content {
            min-height: 700px;
        }

        .content > div {
            min-width: 51%;
        }
    }

    :global(.is-1, .is-2, .is-3, .is-4, .is-5, .is-6, .is-7) {
        font-family: 'Merriweather', serif;
    }
</style>
