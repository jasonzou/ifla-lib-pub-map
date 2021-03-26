<script>
    import {selectedItem} from '../../../stores'
    import MarkdownField from './MarkdownField.svelte'
    import ItemDetailsInfo from './ItemDetailsInfo.svelte'
    import MaterialIcon from '../../MaterialIcon.svelte'

    $: item = $selectedItem
    console.log($selectedItem);

    let subCategories = []

    $: if (item) subCategories = item['Category'].split(',').filter(tag => tag.trim())
    
    $: location = item['Location'].trim().length
    $: estYear= item['Established Year'].trim().length

    function resetSelect() {
        selectedItem.select(null)
    }

    // Name
    // Institution Name
    // Library Name
    // Unit Name
    // Website
    // Email
    // Social Media - Blog
    //,Social Media - Twitter
    //,Social Media - Facebook
    //,Social Media - Instagram
    //,Social Media - YouTube
    //, Social Media - Other,
    //Contact Name,
    //Contact Title,
    //Contact Phone,
    //Contact Email,
    //Program Overview,
    //Location,
    //Stage (1-3),
    //Established Year,
    //Languages,
    //,
    //Additional comments,
    //Sub-Category,
    //Status,
    //Latitude,
    //Longitude
</script>

<div class="details">
    <div class="header">
        <button class="button is-small back" on:click={resetSelect}>
            <MaterialIcon icon="keyboard_backspace"/>
        </button>
        <!-- img class="icon" src="./icons/{item.icon}"/ -->
    </div>
    <div class="content">
        <h1 class="is-5 subtitle is-marginless notranslate" translate="no">{item['Institution Name']}</h1>
        <h2 class="is-5 subtitle is-marginless notranslate" translate="no">{item['Library Name']}</h2>
        {#if item['Library Name'] != item['Unit Name']}
        <h3 class="is-5 subtitle is-marginless notranslate" translate="no">{item['Unit Name']}</h3>
        {/if} 
        <!--
            p class="address">
            <span class="notranslate" translate="no">{item.Address}</span>
            <a href="http://maps.google.com/?q={item.Address}" target="_blank">
                <MaterialIcon icon="pin_drop"/>
            </a>
        </p>
        <Status status={item.Status}/>
    -->
        <br />
        <div class="category">
            <strong>Types of Libraries - </strong>
            {#if subCategories.length}
                <div class="tags are-small">
                    {#each subCategories as tag}
                        <span class="tag">{tag}</span>
                    {/each}
                </div>
            {/if}
        </div>
<!--
        {#if item['Outdoor Space'].trim().length}
            <div class="category">
                <strong>Outdoor Seating -</strong>
                <p><span class="tag is-primary is-small">{item['Outdoor Space']}</span></p>
            </div>
        {/if}

        {#if item['Indoor Seating'] && item['Indoor Seating'].toLowerCase().includes('yes')}
            <div class="category">
                <strong>Indoor Dining - </strong>
                <p><span
                        class="tag is-primary is-small">{item['Indoor Seating'].replace(/^\w/, c => c.toUpperCase())}</span>
                </p>
            </div>
        {/if}
-->
        <!-- Social Media Links -->
        {#if item['Social Media - Blog'] }
           <ItemDetailsInfo url={item['Social Media - Blog']} text=" " icon="blogger-b" type="website"/>
        {/if}
        {#if item['Social Media - Twitter'] }
           <ItemDetailsInfo url={item['Social Media - Twitter']} text=" " icon="twitter" type="website"/>
        {/if}
        {#if item['Social Media - Facebook'] }
           <ItemDetailsInfo url={item['Social Media - Facebook']} text=" " icon="facebook" type="website"/>
        {/if}
        {#if item['Social Media - Instagram'] }
           <ItemDetailsInfo url={item['Social Media - Instagram']} text=" " icon="instagram" type="website"/>
        {/if}
        {#if item['Social Media - YouTube'] }
           <ItemDetailsInfo url={item['Social Media - Youtube']} text=" " icon="youtube" type="website"/>
        {/if}
        {#if item['Social Media - Other'] }
           <ItemDetailsInfo url={item['Social Media - Other']} text=" " icon="public" icontype="mdi" type="website"/>
        {/if}

        <!-- Contact Info -->
        <h4 class="is-5 subtitle is-marginless notranslate" translate="no">Contact:</h4>
        <MarkdownField title="Name" content={item['Contact Name']} type="notitle"/>
        <MarkdownField title="Title" content={item['Contact Title']} type="notitle"/>
        <MarkdownField title="Phone" content={item['Contact Phone']} type="notitle"/>
        <MarkdownField title="Email" content={item['Contact Email']} type="notitle"/>
   
        <br />
 
        <MarkdownField title="Location" content={item.Location}/>
        <MarkdownField title="Established Year" content={item['Established Year']}/>
        <br />
        <MarkdownField title="Program Overview" content={item['Program Overview']}/>

        <MarkdownField title="Hours" content={item.Hours}/>
        <MarkdownField title="Special Accommodation Hours" content={item['Special Accommodation Hours']}/>
<!--        <MarkdownField title="Notes" content={item.Notes}/>-->
        <hr>
<!--
        <PickupDelivery
                pickup={item['Pickup Offered']}
                delivery={item['Delivery Offered']}
                notes={item['Delivery/Pickup Notes']}
        />
        <LastUpdated lastUpdated={item['Last Updated']} source={item['Source']}/>
-->

    </div>
</div>

<style>
    h1{ padding: 15px 0px; font-size:1.8rem}
    h2{ padding: 15px 0px; font-size:1.6rem}
    h4{ padding: 15px 0px; }
    .details {
        padding-top: 10px;
        margin-left: 0.5rem;
        height: 100px;
    }

    .header {
        display: flex;
        flex-direction: row;
        align-items: center;

    }

    .back {
        margin-right: 5px;
    }

    .icon {
        width: 32px;
        height: 35px;
        position: absolute;
        right: 5px;
    }

    .address {
        font-size: 0.9rem;
    }

    .category {
        display: flex;
        flex-direction: row;
    }

    .category * {
        margin-right: 5px;
    }

    .content {
        margin-top: 1rem;
    }

    .content * {
        margin-bottom: 5px;
    }

</style>
