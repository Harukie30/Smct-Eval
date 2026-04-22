"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";

export interface BranchForEmployeesModal {
  id: number;
  branch_name: string;
  branch_code: string;
}

interface BranchEmployeesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBranch: BranchForEmployeesModal | null;
  expectedCount: number;
  dialogAnimationClass?: string;
}

export default function BranchEmployeesModal({
  open,
  onOpenChange,
  selectedBranch,
  expectedCount,
  dialogAnimationClass = "",
}: BranchEmployeesModalProps) {
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const sectionOptions = useMemo(
    () => [
      { value: "all", label: "All Sections" },
      { value: "Sales", label: "Sales" },
      { value: "Service", label: "Service" },
      { value: "Operations", label: "Operations" },
      { value: "Admin", label: "Admin" },
    ],
    []
  );

  return (
    <Dialog open={open} onOpenChangeAction={onOpenChange}>
      <DialogContent className={`max-w-5xl p-0 overflow-hidden ${dialogAnimationClass}`}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-blue-50/60">
          <DialogTitle className="flex items-center gap-2 text-blue-800">
            <Users className="h-5 w-5" />
            {selectedBranch?.branch_name ?? "Branch"} Employees
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            Employees assigned to this branch.
            <Badge variant="outline" className="bg-white">
              Expected: {expectedCount}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="mb-4 w-full sm:w-72">
            <Combobox
              options={sectionOptions}
              value={selectedSection}
              onValueChangeAction={(value) => setSelectedSection(String(value))}
              placeholder="Filter by section"
              searchPlaceholder="Search section..."
              emptyText="No section found."
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto border rounded-lg bg-white">
            <Table wrapperClassName="rounded-lg">
              <TableHeader className="sticky top-0 z-10 bg-slate-50">
                <TableRow>
                  <TableHead className="px-4">Name</TableHead>
                  <TableHead className="px-4">Email</TableHead>
                  <TableHead className="px-4">Position</TableHead>
                  <TableHead className="px-4">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16 text-gray-500">
                    Employee list API for branches is not available yet. Current
                    section filter: {selectedSection === "all" ? "All Sections" : selectedSection}.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer min-w-24"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
