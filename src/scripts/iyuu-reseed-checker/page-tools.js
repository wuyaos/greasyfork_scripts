import { createPTCommon } from '../../common/pt-common.js';



const { DOM: PTDOM, Mount, SITE_FAMILIES, TORRENT_LINK_SELECTORS, needsDownloadForHash, tableMount, AutoFeedAnchors, AdapterRuntime, GazelleSites, GazellePicker } = createPTCommon({
        defaultLabel: 'IYUU',
        productId: 'iyuu',
        gridLabelClass: 'iyuu-grid-label',
        gridContentClass: 'iyuu-grid-content'
    });



export { AdapterRuntime, AutoFeedAnchors, GazellePicker, GazelleSites, Mount, PTDOM, SITE_FAMILIES, TORRENT_LINK_SELECTORS, needsDownloadForHash, tableMount };
