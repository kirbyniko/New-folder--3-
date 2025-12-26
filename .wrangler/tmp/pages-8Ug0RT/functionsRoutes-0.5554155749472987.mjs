import { onRequest as __api_admin_events_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\admin-events.ts"
import { onRequest as __api_admin_events_backup_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\admin-events-backup.ts"
import { onRequest as __api_admin_events_simple_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\admin-events-simple.ts"
import { onRequest as __api_agenda_summaries_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\agenda-summaries.ts"
import { onRequest as __api_congress_meetings_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\congress-meetings.ts"
import { onRequest as __api_db_maintenance_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\db-maintenance.ts"
import { onRequest as __api_local_meetings_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\local-meetings.ts"
import { onRequest as __api_state_events_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\state-events.ts"
import { onRequest as __api_state_events_backup2_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\state-events-backup2.ts"
import { onRequest as __api_state_events_simple_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\state-events-simple.ts"
import { onRequest as __api_test_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\test.ts"
import { onRequest as __api_test_db_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\test-db.ts"
import { onRequest as __api_test_simple_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\test-simple.ts"
import { onRequest as __api_top_events_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\top-events.ts"
import { onRequest as __api_update_tags_ts_onRequest } from "C:\\Users\\nikow\\New folder (3)\\functions\\api\\update-tags.ts"

export const routes = [
    {
      routePath: "/api/admin-events",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_admin_events_ts_onRequest],
    },
  {
      routePath: "/api/admin-events-backup",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_admin_events_backup_ts_onRequest],
    },
  {
      routePath: "/api/admin-events-simple",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_admin_events_simple_ts_onRequest],
    },
  {
      routePath: "/api/agenda-summaries",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_agenda_summaries_ts_onRequest],
    },
  {
      routePath: "/api/congress-meetings",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_congress_meetings_ts_onRequest],
    },
  {
      routePath: "/api/db-maintenance",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_db_maintenance_ts_onRequest],
    },
  {
      routePath: "/api/local-meetings",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_local_meetings_ts_onRequest],
    },
  {
      routePath: "/api/state-events",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_state_events_ts_onRequest],
    },
  {
      routePath: "/api/state-events-backup2",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_state_events_backup2_ts_onRequest],
    },
  {
      routePath: "/api/state-events-simple",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_state_events_simple_ts_onRequest],
    },
  {
      routePath: "/api/test",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_test_ts_onRequest],
    },
  {
      routePath: "/api/test-db",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_test_db_ts_onRequest],
    },
  {
      routePath: "/api/test-simple",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_test_simple_ts_onRequest],
    },
  {
      routePath: "/api/top-events",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_top_events_ts_onRequest],
    },
  {
      routePath: "/api/update-tags",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_update_tags_ts_onRequest],
    },
  ]