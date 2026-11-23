import { createFileRoute } from "@tanstack/react-router";

import { DataModule, type FieldDef } from "@/components/erp/DataModule";
import { Panel, SimpleTable, StatusPill } from "@/components/erp/kit";
import { PERMISSIONS, MODULE_IDS } from "@/lib/erp/rbac";
import { useERP } from "@/lib/erp/store";
import { ROLES } from "@/lib/erp/types";

export const Route = createFileRoute("/app/users")({
  head: () => ({
    meta: [
      { title: "User Management | b Group" },
      {
        name: "description",
        content:
          "Create users, assign roles and companies, enable two-factor authentication and review activity.",
      },
    ],
  }),
  component: Users,
});

const FIELDS: FieldDef[] = [
  { key: "name", label: "Full name", required: true },
  { key: "email", label: "Email (unique login)", required: true },
  { key: "role", label: "Role", type: "select", options: ROLES },
  {
    key: "companyIds",
    label: "Assigned companies (all, or comma-separated company IDs)",
    placeholder: "all",
    required: true,
  },
  { key: "twoFactor", label: "Two-factor authentication", type: "boolean" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["Active", "Disabled"],
    defaultValue: "Active",
  },
  { key: "lastLogin", label: "Last login", type: "date", table: false, readOnly: true },
];

function Users() {
  const state = useERP();
  return (
    <DataModule
      collection="users"
      module="users"
      title="User Management"
      noun="User"
      companyScoped={false}
      description="Every user has a unique login, a role and one or more assigned companies. Company users cannot see unassigned companies, and financial access is permission-based."
      fields={FIELDS}
      statusKey="status"
      canDelete={(r) => r.id !== "u-owner"}
      beforeSave={(row) => ({
        ...row,
        email: String(row.email ?? "")
          .trim()
          .toLowerCase(),
      })}
      summary={() => (
        <>
          <Panel
            title="Role permissions"
            description="Enforce the same rules in the backend and database policies before going live"
            className="mb-6"
          >
            <SimpleTable
              head={[
                "Module",
                ...ROLES.map((r) => r.replace("Company ", "").replace("Group ", "")),
              ]}
              rows={MODULE_IDS.map((m) => [
                m,
                ...ROLES.map((r) =>
                  PERMISSIONS[r][m] === "edit"
                    ? "Edit"
                    : PERMISSIONS[r][m] === "view"
                      ? "View"
                      : "–",
                ),
              ])}
            />
          </Panel>
          <Panel
            title="Activity log"
            description="Latest audit entries (who, what, when)"
            className="mb-6"
          >
            <SimpleTable
              head={["When", "User", "Action", "Target", "Detail"]}
              rows={state.audit
                .slice(0, 12)
                .map((a) => [
                  a.at.replace("T", " ").slice(0, 16),
                  a.user,
                  <StatusPill key="a" value={a.action} />,
                  a.target,
                  a.detail,
                ])}
            />
          </Panel>
        </>
      )}
    />
  );
}
