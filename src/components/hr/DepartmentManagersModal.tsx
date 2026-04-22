"use client";

import { Loader2, UserCheck } from "lucide-react";

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

export interface DepartmentForManagersModal {
  id: number;
  department_name: string;
}

export interface DepartmentManager {
  id: number | string;
  fullName: string;
  email: string;
  role: string;
  position: string;
}

interface DepartmentManagersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDepartment: DepartmentForManagersModal | null;
  managers: DepartmentManager[];
  isLoading: boolean;
  dialogAnimationClass?: string;
}

export default function DepartmentManagersModal({
  open,
  onOpenChange,
  selectedDepartment,
  managers,
  isLoading,
  dialogAnimationClass = "",
}: DepartmentManagersModalProps) {
  return (
    <Dialog open={open} onOpenChangeAction={onOpenChange}>
      <DialogContent className={`max-w-5xl p-0 overflow-hidden ${dialogAnimationClass}`}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-green-50/60">
          <DialogTitle className="flex items-center gap-2 text-green-800">
            <UserCheck className="h-5 w-5" />
            {selectedDepartment?.department_name ?? "Department"} Managers
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            Managers assigned to this department.
            <Badge variant="outline" className="bg-white">
              Total: {managers.length}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="max-h-[60vh] overflow-y-auto border rounded-lg bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading managers...
            </div>
          ) : managers.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              No managers found for this department.
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
                {managers.map((manager) => (
                  <TableRow key={manager.id} className="hover:bg-green-50/40">
                    <TableCell className="font-medium px-4">{manager.fullName}</TableCell>
                    <TableCell className="px-4">{manager.email}</TableCell>
                    <TableCell className="px-4">{manager.position}</TableCell>
                    <TableCell className="px-4">
                      <Badge variant="outline">{manager.role}</Badge>
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
            className="cursor-pointer min-w-24 bg-red-500 hover:bg-red-600 text-white hover:text-white cursor-pointer hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
