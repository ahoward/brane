//
// index.ts - main entry point
//

import { sys } from "./sys.ts"

// register handlers
import { handler as ping_handler } from "./handlers/ping.ts"
import { handler as body_init_handler } from "./handlers/body/init.ts"
import { handler as body_files_add_handler } from "./handlers/body/files/add.ts"
import { handler as body_files_list_handler } from "./handlers/body/files/list.ts"
import { handler as body_files_status_handler } from "./handlers/body/files/status.ts"
import { handler as body_files_hash_handler } from "./handlers/body/files/hash.ts"
import { handler as body_scan_handler } from "./handlers/body/scan.ts"
import { handler as body_fts_index_handler } from "./handlers/body/fts/index.ts"
import { handler as body_fts_search_handler } from "./handlers/body/fts/search.ts"
import { handler as mind_init_handler } from "./handlers/mind/init.ts"
import { handler as mind_concepts_create_handler } from "./handlers/mind/concepts/create.ts"
import { handler as mind_concepts_create_many_handler } from "./handlers/mind/concepts/create-many.ts"
import { handler as mind_concepts_get_handler } from "./handlers/mind/concepts/get.ts"
import { handler as mind_concepts_list_handler } from "./handlers/mind/concepts/list.ts"
import { handler as mind_concepts_update_handler } from "./handlers/mind/concepts/update.ts"
import { handler as mind_concepts_delete_handler } from "./handlers/mind/concepts/delete.ts"
import { handler as mind_edges_create_handler } from "./handlers/mind/edges/create.ts"
import { handler as mind_edges_create_many_handler } from "./handlers/mind/edges/create-many.ts"
import { handler as mind_edges_get_handler } from "./handlers/mind/edges/get.ts"
import { handler as mind_edges_list_handler } from "./handlers/mind/edges/list.ts"
import { handler as mind_edges_update_handler } from "./handlers/mind/edges/update.ts"
import { handler as mind_edges_delete_handler } from "./handlers/mind/edges/delete.ts"
import { handler as mind_provenance_create_handler } from "./handlers/mind/provenance/create.ts"
import { handler as mind_provenance_list_handler } from "./handlers/mind/provenance/list.ts"
import { handler as mind_provenance_delete_handler } from "./handlers/mind/provenance/delete.ts"
import { handler as mind_rules_query_handler } from "./handlers/mind/rules/query.ts"
import { handler as mind_rules_create_handler } from "./handlers/mind/rules/create.ts"
import { handler as mind_rules_delete_handler } from "./handlers/mind/rules/delete.ts"
import { handler as mind_rules_list_handler } from "./handlers/mind/rules/list.ts"
import { handler as mind_rules_get_handler } from "./handlers/mind/rules/get.ts"
import { handler as mind_verify_handler } from "./handlers/mind/verify.ts"
import { handler as mind_annotations_create_handler } from "./handlers/mind/annotations/create.ts"
import { handler as mind_annotations_list_handler } from "./handlers/mind/annotations/list.ts"
import { handler as mind_annotations_get_handler } from "./handlers/mind/annotations/get.ts"
import { handler as mind_annotations_delete_handler } from "./handlers/mind/annotations/delete.ts"
import { handler as mind_search_handler } from "./handlers/mind/search.ts"
import { handler as calabi_extract_handler } from "./handlers/calabi/extract.ts"
import { handler as calabi_extract_llm_handler } from "./handlers/calabi/extract-llm.ts"
import { handler as calabi_scan_handler } from "./handlers/calabi/scan.ts"
import { handler as calabi_pr_verify_handler } from "./handlers/calabi/pr-verify.ts"
import { handler as context_query_handler } from "./handlers/context/query.ts"
import { handler as lens_show_handler } from "./handlers/lens/show.ts"
import { handler as lens_import_handler } from "./handlers/lens/import.ts"
import { handler as lens_export_handler } from "./handlers/lens/export.ts"
import { handler as lens_stats_handler } from "./handlers/lens/stats.ts"
import { handler as lens_bless_handler } from "./handlers/lens/bless.ts"
import { handler as graph_summary_handler } from "./handlers/graph/summary.ts"
import { handler as graph_neighbors_handler } from "./handlers/graph/neighbors.ts"
import { handler as graph_viz_handler } from "./handlers/graph/viz.ts"

sys.register("/ping", ping_handler)
sys.register("/body/init", body_init_handler)
sys.register("/body/files/add", body_files_add_handler)
sys.register("/body/files/list", body_files_list_handler)
sys.register("/body/files/status", body_files_status_handler)
sys.register("/body/files/hash", body_files_hash_handler)
sys.register("/body/scan", body_scan_handler)
sys.register("/body/fts/index", body_fts_index_handler)
sys.register("/body/fts/search", body_fts_search_handler)
sys.register("/mind/init", mind_init_handler)
sys.register("/mind/concepts/create", mind_concepts_create_handler)
sys.register("/mind/concepts/create-many", mind_concepts_create_many_handler)
sys.register("/mind/concepts/get", mind_concepts_get_handler)
sys.register("/mind/concepts/list", mind_concepts_list_handler)
sys.register("/mind/concepts/update", mind_concepts_update_handler)
sys.register("/mind/concepts/delete", mind_concepts_delete_handler)
sys.register("/mind/edges/create", mind_edges_create_handler)
sys.register("/mind/edges/create-many", mind_edges_create_many_handler)
sys.register("/mind/edges/get", mind_edges_get_handler)
sys.register("/mind/edges/list", mind_edges_list_handler)
sys.register("/mind/edges/update", mind_edges_update_handler)
sys.register("/mind/edges/delete", mind_edges_delete_handler)
sys.register("/mind/provenance/create", mind_provenance_create_handler)
sys.register("/mind/provenance/list", mind_provenance_list_handler)
sys.register("/mind/provenance/delete", mind_provenance_delete_handler)
sys.register("/mind/rules/query", mind_rules_query_handler)
sys.register("/mind/rules/create", mind_rules_create_handler)
sys.register("/mind/rules/delete", mind_rules_delete_handler)
sys.register("/mind/rules/list", mind_rules_list_handler)
sys.register("/mind/rules/get", mind_rules_get_handler)
sys.register("/mind/verify", mind_verify_handler)
sys.register("/mind/annotations/create", mind_annotations_create_handler)
sys.register("/mind/annotations/list", mind_annotations_list_handler)
sys.register("/mind/annotations/get", mind_annotations_get_handler)
sys.register("/mind/annotations/delete", mind_annotations_delete_handler)
sys.register("/mind/search", mind_search_handler)
sys.register("/calabi/extract", calabi_extract_handler)
sys.register("/calabi/extract-llm", calabi_extract_llm_handler)
sys.register("/calabi/scan", calabi_scan_handler)
sys.register("/calabi/pr-verify", calabi_pr_verify_handler)
sys.register("/context/query", context_query_handler)
sys.register("/lens/show", lens_show_handler)
sys.register("/lens/import", lens_import_handler)
sys.register("/lens/export", lens_export_handler)
sys.register("/lens/stats", lens_stats_handler)
sys.register("/lens/bless", lens_bless_handler)
sys.register("/graph/summary", graph_summary_handler)
sys.register("/graph/neighbors", graph_neighbors_handler)
sys.register("/graph/viz", graph_viz_handler)

// export
export { sys }
export default sys
