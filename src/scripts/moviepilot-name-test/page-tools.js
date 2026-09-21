import { createPTCommon } from '../../common/pt-common.js';



const { DOM: PTDOM, Mount, SITE_FAMILIES, tableMount, AutoFeedAnchors, AdapterRuntime, GazelleSites, GazellePicker } = createPTCommon({
        defaultLabel: 'MoviePilot',
        productId: 'mp',
        gridLabelClass: 'mp-grid-label',
        gridContentClass: 'mp-grid-content'
    });



export { AdapterRuntime, AutoFeedAnchors, GazellePicker, GazelleSites, Mount, PTDOM, SITE_FAMILIES, tableMount };
