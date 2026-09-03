"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Plus, Loader2, DollarSign, Users, BookOpen, Edit, Trash2 } from "lucide-react";

interface CoursesViewProps { siteId: string; }

export default function CoursesView({ siteId }: CoursesViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: "", description: "", price: 0 });

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", siteId],
    queryFn: async () => { const r = await fetch(`/api/monetization/courses?siteId=${siteId}`, { credentials: "include" }); return r.json(); },
  });

  const { data: analytics } = useQuery({
    queryKey: ["course-analytics", siteId],
    queryFn: async () => { const r = await fetch(`/api/monetization/courses?siteId=${siteId}&action=analytics`, { credentials: "include" }); return r.json(); },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/monetization/courses", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action: "create", siteId, ...newCourse }) });
      if (!r.ok) throw new Error("Failed"); return r.json();
    },
    onSuccess: () => { toast({ title: "Course created" }); setShowCreate(false); setNewCourse({ name: "", description: "", price: 0 }); queryClient.invalidateQueries({ queryKey: ["courses"] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const r = await fetch("/api/monetization/courses", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action: "delete", siteId, courseId }) });
      if (!r.ok) throw new Error("Failed"); return r.json();
    },
    onSuccess: () => { toast({ title: "Course deleted" }); queryClient.invalidateQueries({ queryKey: ["courses"] }); },
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="size-6" /> Course Builder</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and sell digital courses directly from your blog</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}><Plus className="size-3.5 mr-1" /> New Course</Button>
      </div>

      {analytics && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Courses", value: analytics.totalCourses, icon: BookOpen },
            { label: "Enrollments", value: analytics.totalEnrollments, icon: Users },
            { label: "Revenue", value: `$${analytics.totalRevenue}`, icon: DollarSign },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-3 text-center">
              <Icon className="size-5 mx-auto mb-1 text-primary" />
              <div className="text-xl font-bold">{value}</div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Create Course</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={newCourse.name} onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} placeholder="Course name" />
            <Input value={newCourse.description} onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })} placeholder="Description" />
            <Input type="number" value={newCourse.price || ""} onChange={(e) => setNewCourse({ ...newCourse, price: Number(e.target.value) })} placeholder="Price ($)" className="w-32" />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => createMutation.mutate()} disabled={!newCourse.name || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null} Create
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? <div className="col-span-3 flex justify-center py-8"><Loader2 className="size-6 animate-spin" /></div> :
          (courses || []).length === 0 ? (
            <Card className="col-span-3"><CardContent className="p-8 text-center text-muted-foreground">
              <GraduationCap className="size-8 mx-auto mb-2 opacity-30" /><p>No courses yet. Create your first digital product!</p>
            </CardContent></Card>
          ) : (courses || []).map((course: any) => (
            <Card key={course.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm truncate">{course.name}</CardTitle>
                  <Badge variant={course.status === "PUBLISHED" ? "default" : "secondary"} className="text-[10px]">{course.status}</Badge>
                </div>
                <CardDescription className="line-clamp-2 text-xs">{course.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">${course.price}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span><Users className="size-3 inline mr-0.5" />{course.purchaseCount}</span>
                    <span><DollarSign className="size-3 inline mr-0.5" />${course.revenueGenerated}</span>
                  </div>
                </div>
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" className="flex-1 text-[10px]"><Edit className="size-3 mr-1" /> Edit</Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteMutation.mutate(course.id)}><Trash2 className="size-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  );
}
