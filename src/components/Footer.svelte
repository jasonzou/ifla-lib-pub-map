<script>
    import MaterialIcon from './MaterialIcon.svelte'

    let innerWidth
    let opened = true;

</script>

<svelte:window bind:innerWidth={innerWidth}/>

<footer>
<a href="https://www.ifla.org/library-publishing">&copy; Library Publishing Interest Group</a>&nbsp; | &nbsp;
<a href="/test.html">About </a> &nbsp;|&nbsp; 
<a href="/Resources.html">Useful Resources</a> 
</footer>

<style>
   footer{
        display: flex;
        flex: 1;
        max-width: 1500px;
        color: #444;
        margin:auto;
        padding: 0 15px;
    }
    @media only screen and (max-width: 768px) {
       footer {
         display:none;
       }
    }

</style>
