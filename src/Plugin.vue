<script setup>
import { onMounted, watch, ref } from "vue";

import "locuszoom/dist/locuszoom.css";
import LocusZoom from "locuszoom/esm";
import LzTabixSource from "locuszoom/esm/ext/lz-tabix-source";
import LzParsers from "locuszoom/esm/ext/lz-parsers";
import LzDynamicUrls from "locuszoom/esm/ext/lz-dynamic-urls";

LocusZoom.use(LzTabixSource);

const props = defineProps({
    datasetId: String,
    datasetUrl: String,
    root: String,
    settings: Object,
    specs: Object,
    tracks: Array,
});
const errorMessage = ref("");
function render() {
    const id = props.settings.tabix?.id;
    const name = props.settings.tabix?.name;
    const chrIn = props.settings.chromosome;
    const startIn = props.settings.start;
    const endIn = props.settings.end;
    if (endIn - startIn > 10000000) {
        errorMessage.value = "We cannot output more than 10Mb at a time!";
        return;
    }
    if (endIn <= startIn) {
        errorMessage.value = "Invalid input: End position must be bigger than start position!";
        return;
    }
    errorMessage.value=""
    const gwasParser = LzParsers.makeGWASParser({
        chrom_col: 1,
        pos_col: 2,
        ref_col: 6,
        alt_col: 8,
        pvalue_col: 13,
        is_neg_log_pvalue: false,
        beta_col: 9,
        stderr_beta_col: 10,
    });
    const bedParser = LzParsers.makeBed12Parser({ normalize: true });
    const ldParser = LzParsers.makePlinkLdParser({ normalize: true });
    let data_sources = new LocusZoom.DataSources().add("assoc", [
        "TabixUrlSource",
        {
            url_data: `${props.root}api/datasets/${props.datasetId}/display?to_ext=bgzip`,
            url_tbi: `${props.root}api/datasets/${id}/display?to_ext=tbi`,

            parser_func: gwasParser,
            overfetch: 0,
        },
    ]);

    /*
          .add("ld", ["UserTabixLD", {
              // Fetch an LD file with just 3 possible refvars. More limited than an LD server, but able to use LD from a custom population.
              url_data:  data[2],
              url_tbi: data[3],
              parser_func: ldParser,
          }])
          .add("recomb", ["RecombLZ", { url: apiBase + "annotation/recomb/results/", build: 'GRCh37' }])*/
    /*
          .add("gene", ["GeneLZ", { url: apiBase + "annotation/genes/", build: 'GRCh37' }])
          
          .add("constraint", ["GeneConstraintLZ", { url: "https://gnomad.broadinstitute.org/api/", build: 'GRCh37' }]);
          */

    let stateUrlMapping = { chr: "chrom", start: "start", end: "end", ldrefvar: "ld_variant" };
    // Fetch initial position from the URL, or use some defaults
    let initialState = LzDynamicUrls.paramsFromUrl(stateUrlMapping);
    if (!Object.keys(initialState).length) {
        initialState = { chr: chrIn, start: startIn, end: endIn };
    } else {
        initialState = { chr: chrIn, start: startIn, end: endIn };
    }

    /* const layout = LocusZoom.Layouts.get("plot", "standard_association", {
          state: initialState,
          panels: [
              LocusZoom.Layouts.get('panel', 'association', { title: { text: "GIANT BMI meta-analysis (women only)" }}),
              LocusZoom.Layouts.get('panel', 'bed_intervals', {title: { text: "Accessible chromatin (ChIP - Pancreatic Islets)" }}),
              LocusZoom.Layouts.get('panel', 'genes'),
          ],
      });*/

    let association_panel_mods = {
        data_layers: [LocusZoom.Layouts.get("data_layer", "significance", { name: "Line of GWAS Significance" })],
        toolbar: LocusZoom.Layouts.get("panel", "association")["toolbar"],
    };

    let layout2 = {
        state: initialState,
        width: 800,
        responsive_resize: true,
        panels: [
            LocusZoom.Layouts.get("panel", "association", association_panel_mods),
            //LocusZoom.Layouts.get("panel", "genes", { namespace: { "gene": "gene" } })
        ],
        toolbar: LocusZoom.Layouts.get("toolbar", "standard_plot"),
    };

    let association_data_layer_mods = {
        id: "associationpvalues_",
        name: "association",
        point_shape: "circle",
        point_size: 40,
        color: "rgb(212, 63, 58)",
        legend: [
            { shape: "circle", color: "rgb(212, 63, 58)", size: 40, label: "phen", class: "lz-data_layer-scatter" },
        ],
        tooltip: {
            closable: true,
            show: { or: ["highlighted", "selected"] },
            hide: { and: ["unhighlighted", "unselected"] },
            html: `<strong>phen</strong><br><strong>{{assoc:variant|htmlescape}}</strong><br>
                P Value: <strong>{{assoc:log_pvalue|logtoscinotation|htmlescape}}</strong><br>
                Ref. Allele: <strong>{{assoc:ref_allele|htmlescape}}</strong><br>`,
        },
    };

    const layer_layout = LocusZoom.Layouts.get("data_layer", "association_pvalues", association_data_layer_mods);
    layer_layout.namespace = { assoc: "assoc" };
    layer_layout.data_operations = [];
    layout2.panels[0].data_layers.push(layer_layout);

    let plot = LocusZoom.populate("#lz-plot", data_sources, layout2);
    LzDynamicUrls.plotUpdatesUrl(plot, stateUrlMapping);
    LzDynamicUrls.plotWatchesUrl(plot, stateUrlMapping);
}

onMounted(() => {
    render();
});

watch(
    () => props,
    () => {
        render();
    },
    { deep: true },
);
</script>

<template>
    <div id="lz-plot" class="h-100"></div>
    <div class="error-message" v-if="errorMessage" style="color: red; margin-top: 10px">{{ errorMessage }}</div>
</template>
<style scoped>
.error-message {
    margin-top: 15px;
    padding: 10px 20px;
    border: 1px solid #f44336;
    background-color: #fdecea;
    color: #b71c1c;
    border-radius: 5px;
    font-size: 14px;
    font-weight: 500;
    text-align: center;
}
</style>
