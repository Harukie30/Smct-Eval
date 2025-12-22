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

export default function EmployeesTab() {
  //refreshing state
  const [isRefreshing, setIsRefreshing] = useState(false);
  // const [isPageLoading, setIsPageLoading] = useState(false);

  //Active employees
  const [employees, setEmployees] = useState<User[]>([]);
  const [positions, setPositions] = useState<
    {
      value: string | number;
      label: string;
    }[]
  >([]);

  // filters
  const [positionFilter, setPositionFilter] = useState<string | number>("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [employeesPage, setEmployeesPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        setIsRefreshing(true);
        const positionsRes = await apiService.getPositions();
        setPositions(positionsRes);

        const res = await apiService.getActiveRegistrations();
        setEmployees(res.data);
        setIsRefreshing(false);
      } catch (error) {
        console.error("Error fetching positions:", error);
      }
    };
    fetchPositions();
  }, []);

  useEffect(() => {
    if (!isRefreshing) return;
    const fetchEmployees = async () => {
      try {
        const res = await apiService.getActiveRegistrations();
        setEmployees(res.data);
        setIsRefreshing(false);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchEmployees();
  }, [isRefreshing]);

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

  // Handle page change with loading state
  const handlePageChange = (newPage: number) => {
    setIsRefreshing(true);
    setEmployeesPage(newPage);
    // Simulate a brief loading delay for smooth UX
    setTimeout(() => {
      setIsRefreshing(false);
    }, 300);
  };

  // Calculate new hires this month
  const newHiresThisMonth = (() => {
    const now = new Date();
    // Hire date removed - return 0 for new hires this month
    return 0;
  })();

  return (
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
                {/* Total: {filtered.length} */}
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
            onClick={() => setIsRefreshing(true)}
            disabled={false}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
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
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className=" pr-10"
            />
            {employeeSearch && (
              <button
                onClick={() => setEmployeeSearch("")}
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
              setPositionFilter(value);
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
                  {Array.from({ length: 8 }).map((_, index) => (
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
                {Array.from({ length: 8 }).map((_, index) => (
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
                  {!employees ? (
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
                    employees?.map((employee: any) => {
                      // Check if user is new (within 30 minutes) or recently added (after 30 minutes, within 48 hours)
                      const createdDate = employee.created_at
                        ? new Date(employee.created_at)
                        : null;
                      let isNew = false;
                      let isRecentlyAdded = false;

                      if (createdDate) {
                        const now = new Date();
                        const minutesDiff =
                          (now.getTime() - createdDate.getTime()) / (1000 * 60);
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
                          <TableCell>{employee.email}</TableCell>
                          <TableCell>
                            {employee.positions.label || "N/A"}
                          </TableCell>
                          <TableCell>
                            {employee.branches[0]?.branch_name || "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {employee.roles[0]?.name || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => {}}
                                title="View employee details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => {}}
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

        {/* Pagination Controls - Centered (matching admin style) */}
        {
          // employeesTotal > itemsPerPage &&
          //   (() => {
          //     // Function to render page buttons with ellipses (matching admin style)
          //     const renderPages = () => {
          //       let pages: (number | "...")[] = [];
          //       // Always show first page
          //       pages.push(1);
          //       // Insert ellipsis after first page if needed
          //       if (employeesPage > 3) {
          //         pages.push("...");
          //       }
          //       // Show pages around current (employeesPage - 1, employeesPage, employeesPage + 1)
          //       for (let i = employeesPage - 1; i <= employeesPage + 1; i++) {
          //         if (i > 1 && i < employeesTotalPages) {
          //           pages.push(i);
          //         }
          //       }
          //       // Insert ellipsis before last page if needed
          //       if (employeesPage < employeesTotalPages - 2) {
          //         pages.push("...");
          //       }
          //       // Always show last page
          //       if (employeesTotalPages > 1) {
          //         pages.push(employeesTotalPages);
          //       }
          //       return pages.map((p, index) => {
          //         if (p === "...") {
          //           return (
          //             <PaginationItem key={`ellipsis-${index}`}>
          //               <PaginationEllipsis />
          //             </PaginationItem>
          //           );
          //         }
          //         return (
          //           <PaginationItem key={p}>
          //             <PaginationLink
          //               onClick={(e) => {
          //                 e.preventDefault();
          //                 if (Number(p) !== employeesPage) {
          //                   handlePageChange(Number(p));
          //                 }
          //               }}
          //               className={
          //                 p === employeesPage
          //                   ? "bg-blue-400 text-white rounded-xl"
          //                   : ""
          //               }
          //             >
          //               {p}
          //             </PaginationLink>
          //           </PaginationItem>
          //         );
          //       });
          //     };
          //     const startIndex = (employeesPage - 1) * itemsPerPage;
          //     const endIndex = employeesPage * itemsPerPage;
          //     return (
          //       <div className="flex flex-col items-center justify-center gap-3 w-full p-2 mt-4">
          //         <div className="text-sm text-gray-600">
          //           Showing {startIndex + 1} to{" "}
          //           {Math.min(endIndex, employeesTotal)} of {employeesTotal}{" "}
          //           records
          //         </div>
          //         <div>
          //           <Pagination>
          //             <PaginationContent>
          //               {/* PREVIOUS */}
          //               <PaginationItem>
          //                 <PaginationPrevious
          //                   className={
          //                     employeesPage === 1
          //                       ? "hover:pointer-events-none bg-blue-100 opacity-50"
          //                       : "hover:bg-blue-400 bg-blue-200"
          //                   }
          //                   onClick={(e) => {
          //                     e.preventDefault();
          //                     if (employeesPage > 1) {
          //                       handlePageChange(employeesPage - 1);
          //                     }
          //                   }}
          //                 />
          //               </PaginationItem>
          //               {/* PAGE NUMBERS WITH ELLIPSES */}
          //               {renderPages()}
          //               {/* NEXT */}
          //               <PaginationItem>
          //                 <PaginationNext
          //                   className={
          //                     employeesPage === employeesTotalPages
          //                       ? "hover:pointer-events-none bg-blue-100 opacity-50"
          //                       : "hover:bg-blue-400 bg-blue-200"
          //                   }
          //                   onClick={(e) => {
          //                     e.preventDefault();
          //                     if (employeesPage < employeesTotalPages) {
          //                       handlePageChange(employeesPage + 1);
          //                     }
          //                   }}
          //                 />
          //               </PaginationItem>
          //             </PaginationContent>
          //           </Pagination>
          //         </div>
          //       </div>
          //     );
          //   })()
        }
      </CardContent>
    </Card>
  );
}
