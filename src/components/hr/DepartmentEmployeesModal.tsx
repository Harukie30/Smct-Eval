"use client";

import { useMemo, useState } from "react";
import { Loader2, Users } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";

export interface DepartmentForEmployeesModal {
  id: number;
  department_name: string;
}

export interface DepartmentEmployee {
  id: number | string;
  fullName: string;
  email: string;
  role: string;
  position: string;
  section?: string;
}

interface DepartmentEmployeesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDepartment: DepartmentForEmployeesModal | null;
  employees: DepartmentEmployee[];
  isLoading: boolean;
  dialogAnimationClass?: string;
}

export default function DepartmentEmployeesModal({
  open,
  onOpenChange,
  selectedDepartment,
  employees,
  isLoading,
  dialogAnimationClass = "",
}: DepartmentEmployeesModalProps) {
  const [selectedSection, setSelectedSection] = useState<string>("all");

  const sectionOptions = useMemo(() => {
    const uniqueSections = Array.from(
      new Set(
        employees.map((employee) => employee.section?.trim() || "Unassigned")
      )
    ).sort((a, b) => a.localeCompare(b));

    return [
      { value: "all", label: "All Sections" },
      ...uniqueSections.map((section) => ({ value: section, label: section })),
    ];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (selectedSection === "all") return employees;
    return employees.filter(
      (employee) => (employee.section?.trim() || "Unassigned") === selectedSection
    );
  }, [employees, selectedSection]);

  return (
    <Dialog open={open} onOpenChangeAction={onOpenChange}>
      <DialogContent className={`max-w-5xl p-0 overflow-hidden ${dialogAnimationClass}`}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-blue-50/60">
          <DialogTitle className="flex items-center gap-2 text-blue-800">
            <Users className="h-5 w-5" />
            {selectedDepartment?.department_name ?? "Department"} Employees
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            Employees assigned to this department.
            <Badge variant="outline" className="bg-white">
              Total: {employees.length}
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
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading employees...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              No employees found for the selected section.
            </div>
          ) : (
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
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} className="hover:bg-blue-50/40">
                    <TableCell className="font-medium px-4">{employee.fullName}</TableCell>
                    <TableCell className="px-4">{employee.email}</TableCell>
                    <TableCell className="px-4">{employee.position}</TableCell>
                    <TableCell className="px-4">
                      <Badge variant="outline">{employee.role}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer min-w-24 bg-red-600 hover:bg-red-700 text-white hover:text-white hover:scale-110 transition-transform duration-200"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
