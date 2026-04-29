import { ComingSoon } from "@/components/PageShell";
import { PageHeader } from "@/components/PageShell";
import { FileText, Landmark, BarChart3, Settings as SettingsIcon } from "lucide-react";

export function Documents() {
  return (<div><PageHeader icon={FileText} title="Documents" description="Aadhaar, electricity bills, agreements — secure, encrypted storage." /><ComingSoon feature="Document management" /></div>);
}
export function Compliance() {
  return (<div><PageHeader icon={Landmark} title="Government Compliance" description="Subsidy tracking, net metering, approvals." /><ComingSoon feature="Compliance workflow" /></div>);
}
export function Analytics() {
  return (<div><PageHeader icon={BarChart3} title="Advanced Analytics" description="Conversion funnel, location intelligence, sales rep ranking." /><ComingSoon feature="Advanced analytics" /></div>);
}
export function Settings() {
  return (<div><PageHeader icon={SettingsIcon} title="Settings" description="Company profile, team, billing." /><ComingSoon feature="Settings & team management" /></div>);
}
