"use client";

import { useState, useEffect } from "react";
import { X, Eye, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox } from "@/components/ui/combobox";
import { User } from "../../../contexts/UserContext";
import apiService from "@/lib/apiService";
import { set } from "date-fns";
import EvaluationTypeModal from "@/components/EvaluationTypeModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import EvaluationForm from "@/components/evaluation";
import ManagerEvaluationForm from "@/components/evaluation-2";
import EvaluationsPagination from "@/components/paginationComponent";
import ViewEmployeeModal from "@/components/ViewEmployeeModal";

export default function EmployeesTab() {
  //refreshing state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger

  //data employees
  const [employees, setEmployees] = useState<User[] | null>(null);
  const [positions, setPositions] = useState<
    {
      value: string | number;
      label: string;
    }[]
  >([]);

  // filters
  const [positionFilter, setPositionFilter] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  //pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [overviewTotal, setOverviewTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(0);

  // modals
  const [isEvaluationTypeModalOpen, setIsEvaluationTypeModalOpen] =
    useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [evaluationType, setEvaluationType] = useState<
    "employee" | "manager" | null
  >(null);
  const [isViewEmployeeModalOpen, setIsViewEmployeeModalOpen] = useState(false);

  // View Employee Modal states
  const [selectedEmployeeForView, setSelectedEmployeeForView] =
    useState<User | null>(null);
  const [selectedEmployeeForEvaluation, setSelectedEmployeeForEvaluation] =
    useState<User | null>(null);

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        setIsRefreshing(true);
        const positionsRes = await apiService.getPositions();
        setPositions(positionsRes);
        setIsRefreshing(false);
      } catch (error) {
        console.error("Error fetching positions:", error);
        setIsRefreshing(false);
      }
    };
    fetchPositions();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setIsRefreshing(true);
        const res = await apiService.getAllEmployeeByAuth(
          debouncedSearch,
          currentPage,
          itemsPerPage,
          Number(positionFilter)
        );

        // Add safety checks to prevent "Cannot read properties of undefined" error
        if (!res) {
          console.error("API response is undefined");
          setEmployees([]);
          setOverviewTotal(0);
          setTotalPages(1);
          setPerPage(itemsPerPage);
          setIsRefreshing(false);
          return;
        }

        // Ensure we have an array
        const employeesData = Array.isArray(res.data) ? res.data : [];
        setEmployees(employeesData);
        setOverviewTotal(res.total || 0);
        setTotalPages(res.last_page || 1);
        setPerPage(res.per_page || itemsPerPage);

        setIsRefreshing(false);
      } catch (error) {
        console.error("Error fetching employees:", error);
        // Set default values on error
        setEmployees([]);
        setOverviewTotal(0);
        setTotalPages(1);
        setPerPage(itemsPerPage);
        setIsRefreshing(false);
      }
    };
    fetchEmployees();
  }, [
    positionFilter,
    debouncedSearch,
    currentPage,
    itemsPerPage,
    refreshTrigger,
  ]); // Add refreshTrigger to dependencies

  useEffect(() => {
    const debounceSearch = setTimeout(() => {
      setDebouncedSearch(employeeSearch);
    }, 500);
    return () => clearTimeout(debounceSearch);
  }, [employeeSearch]);

  // Get all employees from API (passed as prop)
  // const allEmployees = useMemo(() => {
  //   if (!employees || employees.length === 0) return [];

  //   return employees.map((e: any) => ({
  //     id: e.employeeId || e.id,
  //     name: e.name || `${e.fname || ""} ${e.lname || ""}`.trim(),
  //     email: e.email,
  //     position: e.positions?.label || e.position?.name || e.position || "N/A",
  //     department:
  //       e.departments?.department_name ||
  //       e.department?.name ||
  //       e.department ||
  //       "N/A",
  //     branch:
  //       (e.branches &&
  //         Array.isArray(e.branches) &&
  //         e.branches[0]?.branch_name) ||
  //       e.branch?.name ||
  //       e.branch ||
  //       "N/A",
  //     role:
  //       (e.roles && Array.isArray(e.roles) && e.roles[0]?.name) ||
  //       e.role?.name ||
  //       e.role ||
  //       "N/A",
  //     isActive: e.isActive !== false,
  //     avatar: e.avatar,
  //     created_at: e.created_at, // Include created_at for highlighting
  //   }));
  // }, []);

  // Extract unique positions from employees
  // const uniquePositions = useMemo(() => {
  //   const positionSet = new Set<string>();
  //   allEmployees.forEach((e: any) => {
  //     const pos = e.position;
  //     if (pos && typeof pos === "string" && pos.trim() !== "") {
  //       positionSet.add(pos);
  //     }
  //   });
  // Also add positions from the positions prop if they're strings
  //   positions.forEach((pos: any) => {
  //     const posName =
  //       typeof pos === "string" ? pos : pos?.name || String(pos || "");
  //     if (posName && typeof posName === "string" && posName.trim() !== "") {
  //       positionSet.add(posName);
  //     }
  //   });
  //   return Array.from(positionSet).sort();
  // }, [allEmployees, positions]);

  // Use the custom hook for filtering
  // const filteredEmployees = useEmployeeFiltering({
  //   currentUser,
  //   employees: allEmployees,
  //   searchQuery: employeeSearch,
  //   selectedDepartment,
  // });

  // const filtered: Employee[] = useMemo(() => {
  //   return filteredEmployees
  //     .filter((e: any) => {
  //       // Filter by position if selected
  //       if (selectedPosition && e.position !== selectedPosition) {
  //         return false;
  //       }
  //       return true;
  //     })
  //     .map((e: any) => {
  //       // const updatedEmployee = getUpdatedEmployeeData(e);

  //       return {
  //   id: updatedEmployee.employeeId || updatedEmployee.id,
  //   name: updatedEmployee.name,
  //   email: updatedEmployee.email,
  //   position: updatedEmployee.position,
  //   department: updatedEmployee.department,
  //   role: updatedEmployee.role,
  //   avatar: updatedEmployee.avatar,
  //   branch: updatedEmployee.branch || "N/A",
  //   created_at: updatedEmployee.created_at, // Include created_at for highlighting
  //       };
  //     });
  // }, [filteredEmployees, selectedPosition]);

  // Pagination calculations
  // const employeesTotal = filtered.length;
  // const employeesTotalPages = Math.ceil(employeesTotal / itemsPerPage);
  // const employeesStartIndex = (employeesPage - 1) * itemsPerPage;
  // const employeesEndIndex = employeesStartIndex + itemsPerPage;
  // const employeesPaginated = filtered.slice(
  //   employeesStartIndex,
  //   employeesEndIndex
  // );

  // Reset to page 1 when filters/search change
  // useEffect(() => {
  //   setEmployeesPage(1);
  // }, [employeeSearch, selectedDepartment, selectedPosition]);

  // Calculate new hires this month
  const newHiresThisMonth = (() => {
    const now = new Date();
    // Hire date removed - return 0 for new hires this month
    return 0;
  })();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle>Employee Directory</CardTitle>
                <CardDescription>Search and manage employees</CardDescription>
              </div>
              {/* Badge-style employee counts */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="px-3 py-1 text-sm font-semibold bg-blue-50 text-blue-700 border-blue-200"
                >
                  Total: {overviewTotal || 0}
                </Badge>
                <Badge
                  variant="outline"
                  className="px-3 py-1 text-sm font-semibold bg-green-50 text-green-700 border-green-200"
                >
                  New Hires: {newHiresThisMonth}
                </Badge>
              </div>
            </div>
            <Button
              onClick={() => {
                setRefreshTrigger((prev) => prev + 1); // Trigger refresh by incrementing counter
              }}
              disabled={isRefreshing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
              title="Refresh employee data"
            >
              {isRefreshing ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Refreshing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>🔄</span>
                  <span>Refresh</span>
                </div>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 w-1/3 ">
            <div className="relative flex-1">
              <Input
                placeholder="Search employees..."
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value);
                }}
                className=" pr-10"
              />
              {employeeSearch && (
                <button
                  onClick={() => {
                    setEmployeeSearch("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-600"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Combobox
              options={positions}
              value={positionFilter}
              onValueChangeAction={(value) => {
                setPositionFilter(String(value));
              }}
              placeholder="All Positions"
              searchPlaceholder="Search positions..."
              emptyText="No positions found."
              className="w-[180px]"
            />
            {(employeeSearch || positionFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setEmployeeSearch("");
                  setPositionFilter("");
                }}
                className="px-4 py-2 text-sm text-red-400"
                title="Clear all filters"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex-wrap mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                Status Indicators:
              </span>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300"
                >
                  ✨ New Added (≤30min)
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300"
                >
                  🕐 Recently Added (&gt;30min)
                </Badge>
              </div>
            </div>
          </div>

          {isRefreshing ? (
            <div className="relative max-h-[500px] overflow-y-auto">
              {/* Centered Loading Spinner with Logo */}
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    {/* Spinning ring */}
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    {/* Logo in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src="/smct.png"
                        alt="SMCT Logo"
                        className="h-10 w-10 object-contain"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    Loading employees...
                  </p>
                </div>
              </div>

              {/* Table structure visible in background */}
              <div className="relative overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Skeleton loading rows */}
                    {Array.from({ length: itemsPerPage }).map((_, index) => (
                      <TableRow key={`skeleton-employee-${index}`}>
                        <TableCell className="px-6 py-3">
                          <Skeleton className="h-6 w-24" />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Skeleton className="h-6 w-24" />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Skeleton className="h-6 w-24" />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Skeleton className="h-6 w-24" />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Skeleton className="h-6 w-24" />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Skeleton className="h-6 w-24" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : isRefreshing ? (
            <div className="relative overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Skeleton loading rows - no spinner for page changes */}
                  {Array.from({ length: itemsPerPage }).map((_, index) => (
                    <TableRow key={`skeleton-employee-page-${index}`}>
                      <TableCell className="px-6 py-3">
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <>
              <div className="relative overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!employees ||
                    employees === null ||
                    !Array.isArray(employees) ||
                    employees.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-gray-500"
                        >
                          <div className="flex flex-col items-center justify-center gap-4">
                            <img
                              src="/not-found.gif"
                              alt="No data"
                              className="w-25 h-25 object-contain"
                              style={{
                                imageRendering: "auto",
                                willChange: "auto",
                                transform: "translateZ(0)",
                                backfaceVisibility: "hidden",
                                WebkitBackfaceVisibility: "hidden",
                              }}
                            />
                            <div className="text-gray-500">
                              <p className="text-base font-medium mb-1">
                                No employees found
                              </p>
                              <p className="text-sm text-gray-400">
                                Try adjusting your search or filter criteria
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((employee: any) => {
                        // Check if user is new (within 30 minutes) or recently added (after 30 minutes, within 48 hours)
                        const createdDate = employee.created_at
                          ? new Date(employee.created_at)
                          : null;
                        let isNew = false;
                        let isRecentlyAdded = false;

                        if (createdDate) {
                          const now = new Date();
                          const minutesDiff =
                            (now.getTime() - createdDate.getTime()) /
                            (1000 * 60);
                          const hoursDiff = minutesDiff / 60;
                          isNew = minutesDiff <= 30;
                          isRecentlyAdded = minutesDiff > 30 && hoursDiff <= 48;
                        }

                        return (
                          <TableRow
                            key={employee.id}
                            className={
                              isNew
                                ? "bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100 hover:shadow-md transition-all duration-200 cursor-pointer"
                                : isRecentlyAdded
                                ? "bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100 hover:shadow-md transition-all duration-200 cursor-pointer"
                                : "hover:bg-blue-100 hover:shadow-md transition-all duration-200 cursor-pointer"
                            }
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span>
                                  {employee.fname + " " + employee.lname}
                                </span>
                                {isNew && (
                                  <Badge className="bg-green-500 text-white text-xs px-2 py-0.5 font-semibold">
                                    ✨
                                  </Badge>
                                )}
                                {isRecentlyAdded && !isNew && (
                                  <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5 font-semibold">
                                    🕐
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{employee.email || "N/A"}</TableCell>
                            <TableCell>
                              {employee.positions?.label ||
                                employee.position ||
                                "N/A"}
                            </TableCell>
                            <TableCell>
                              {employee.branches &&
                              Array.isArray(employee.branches) &&
                              employee.branches.length > 0
                                ? employee.branches[0]?.branch_name || "N/A"
                                : employee.branch || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {employee.roles &&
                                Array.isArray(employee.roles) &&
                                employee.roles.length > 0
                                  ? employee.roles[0]?.name || "N/A"
                                  : employee.role || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700"
                                  onClick={() => {
                                    setSelectedEmployeeForView(employee);
                                    setIsViewEmployeeModalOpen(true);
                                  }}
                                  title="View employee details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => {
                                    setIsEvaluationTypeModalOpen(true);
                                    setSelectedEmployeeForEvaluation(employee);
                                  }}
                                  title="Evaluate employee performance"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {overviewTotal > itemsPerPage && (
            <EvaluationsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={overviewTotal}
              perPage={perPage}
              onPageChange={(page) => {
                setCurrentPage(page);
              }}
            />
          )}

          {/* View Employee Modal Component */}
          <ViewEmployeeModal
            isOpen={isViewEmployeeModalOpen}
            onCloseAction={() => {
              setIsViewEmployeeModalOpen(false);
              setSelectedEmployeeForView(null);
            }}
            employee={selectedEmployeeForView}
            designVariant="admin"
            onStartEvaluationAction={() => {}}
            onViewSubmissionAction={() => {}}
          />
        </CardContent>
      </Card>
      <EvaluationTypeModal
        isOpen={isEvaluationTypeModalOpen}
        onCloseAction={() => {
          setIsEvaluationTypeModalOpen(false);
          if (!evaluationType) {
            setSelectedEmployee(null);
          }
        }}
        onSelectEmployeeAction={() => {
          const employee = selectedEmployeeForEvaluation;
          if (!employee) {
            console.error("No employee selected!");
            return;
          }
          setEvaluationType("employee");
          setIsEvaluationTypeModalOpen(false);

          setIsEvaluationModalOpen(true);
        }}
        onSelectManagerAction={() => {
          const employee = selectedEmployee;
          if (!employee) {
            console.error("No employee selected!");
            return;
          }
          setEvaluationType("manager");
          setIsEvaluationTypeModalOpen(false);

          setIsEvaluationModalOpen(true);
        }}
        employeeName={selectedEmployee?.fname + " " + selectedEmployee?.lname}
      />

      <Dialog
        open={isEvaluationModalOpen}
        onOpenChangeAction={(open) => {
          if (!open) {
            setIsEvaluationModalOpen(false);
            setSelectedEmployee(null);
            setEvaluationType(null);
          }
        }}
      >
        <DialogContent className="max-w-7xl max-h-[101vh] overflow-hidden p-0 evaluation-container">
          {selectedEmployeeForEvaluation && evaluationType === "employee" && (
            <EvaluationForm
              employee={selectedEmployeeForEvaluation}
              onCloseAction={() => {
                setIsEvaluationModalOpen(false);
                setSelectedEmployee(null);
                setEvaluationType(null);
              }}
            />
          )}
          {/* {selectedEmployee && evaluationType === "manager" && (
            <ManagerEvaluationForm
              key={`manager-eval-${selectedEmployee.id}-${evaluationType}`}
              employee={{
                ...selectedEmployee,
                name: selectedEmployee.name || "",
                email: selectedEmployee.email || "",
                position: selectedEmployee.position || "",
                department: selectedEmployee.department || "",
                role: selectedEmployee.role || "",
              }}
              currentUser={getCurrentUserData()}
              onCloseAction={() => {
                setIsEvaluationModalOpen(false);
                setSelectedEmployee(null);
                setEvaluationType(null);
              }}
            />
          )} */}
          {/* {selectedEmployee && !evaluationType && (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                Please select an evaluation type... (Debug: employee=
                {selectedEmployee?.name}, type={evaluationType})
              </p>
            </div>
          )} */}
          {/* {!selectedEmployee && (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                No employee selected (Debug: evaluationType={evaluationType})
              </p>
            </div>
          )} */}
        </DialogContent>
      </Dialog>
    </>
  );
}
