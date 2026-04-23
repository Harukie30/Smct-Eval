"use client";

import { Loader2, Users } from "lucide-react";

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

export interface BranchForEmployeesModal {
  id: number;
  branch_name: string;
  branch_code: string;
}

export interface BranchEmployee {
  id: number | string;
  fullName: string;
  email: string;
  role: string;
  position: string;
  section?: string;
}

interface BranchEmployeesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBranch: BranchForEmployeesModal | null;
  employees: BranchEmployee[];
  isLoading: boolean;
  dialogAnimationClass?: string;
}

export default function BranchEmployeesModal({
  open,
  onOpenChange,
  selectedBranch,
  employees,
  isLoading,
  dialogAnimationClass = "",
}: BranchEmployeesModalProps) {
  const shouldEnableTableScroll = employees.length > 8;

  return (
    <Dialog open={open} onOpenChangeAction={onOpenChange}>
      <DialogContent className={`max-w-5xl p-0 overflow-hidden ${dialogAnimationClass}`}>
        <div
          className="pointer-events-none absolute left-6 right-6 top-24 bottom-6 bg-center bg-no-repeat opacity-[0.07]"
          style={{ backgroundImage: "url('/smct.png')", backgroundSize: "55%" }}
        />
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-blue-50/60">
          <DialogTitle className="flex items-center gap-2 text-blue-800">
            <Users className="h-5 w-5" />
            {selectedBranch?.branch_name ?? "Branch"} Employees
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            Employees assigned to this branch.
            <Badge variant="outline" className="bg-white">
              Total: {employees.length}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="relative px-6 py-4">
          <div
            className={`border rounded-lg bg-white ${
              shouldEnableTableScroll ? "max-h-[60vh] overflow-y-auto" : "overflow-visible"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading employees...
              </div>
            ) : employees.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                No employees found for this branch.
              </div>
            ) : (
              <Table wrapperClassName="rounded-lg">
                <TableHeader className="sticky top-0 z-10 bg-slate-50">
                  <TableRow>
                    <TableHead className="px-4">Name</TableHead>
                    <TableHead className="px-4">Email</TableHead>
                    <TableHead className="px-4">Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-blue-50/40">
                      <TableCell className="font-medium px-4">{employee.fullName}</TableCell>
                      <TableCell className="px-4">{employee.email}</TableCell>
                      <TableCell className="px-4">{employee.position}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <DialogFooter className="relative px-6 pb-6 pt-2 border-t bg-gray-50/95">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer min-w-24 bg-red-500 hover:bg-red-600 text-white hover:text-white cursor-pointer hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
