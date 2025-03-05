"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/components/ui/use-toast";
import { useOrganization } from "@/lib/organizations/context";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserIcon, MoreHorizontalIcon, CheckIcon, XIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define the invite form schema
const inviteFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["member", "admin", "owner"], {
    required_error: "Please select a role",
  }),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

// Define the member update form schema
const updateRoleSchema = z.object({
  role: z.enum(["member", "admin", "owner"], {
    required_error: "Please select a role",
  }),
});

type UpdateRoleValues = z.infer<typeof updateRoleSchema>;

// Define the member type
interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: "member" | "admin" | "owner";
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  invitedEmail?: string;
  inviteAccepted?: boolean;
}

export function OrganizationMembers() {
  const { currentOrganization, refreshOrganizations } = useOrganization();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<OrganizationMember[]>([]);

  // Fetch members when the component mounts or when the organization changes
  const fetchMembers = async () => {
    if (!currentOrganization) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/trpc/organization.getMembers?input=${encodeURIComponent(JSON.stringify({ organizationId: currentOrganization.id }))}`);
      if (!response.ok) {
        throw new Error('Failed to fetch organization members');
      }
      
      const result = await response.json();
      setMembers(result.result.data.json || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: "Error",
        description: "Failed to load organization members",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize the invite form
  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  // Initialize the update role form
  const updateRoleForm = useForm<UpdateRoleValues>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      role: "member",
    },
  });

  // Handle invite submission
  const onInviteSubmit = async (data: InviteFormValues) => {
    if (!currentOrganization) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/trpc/organization.addMember', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: {
            organizationId: currentOrganization.id,
            email: data.email,
            role: data.role,
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to invite member');
      }
      
      await fetchMembers();
      await refreshOrganizations();
      
      toast({
        title: "Success",
        description: `Invitation sent to ${data.email}`,
      });
      
      inviteForm.reset();
      setIsInviteDialogOpen(false);
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: "Error",
        description: "Failed to invite member",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle role update submission
  const onUpdateRoleSubmit = async (data: UpdateRoleValues) => {
    if (!currentOrganization || !selectedMemberId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/trpc/organization.updateMember', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: {
            organizationId: currentOrganization.id,
            userId: selectedMemberId,
            role: data.role,
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update member role');
      }
      
      await fetchMembers();
      await refreshOrganizations();
      
      toast({
        title: "Success",
        description: "Member role updated",
      });
      
      updateRoleForm.reset();
      setIsUpdateDialogOpen(false);
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: "Error",
        description: "Failed to update member role",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle member removal
  const handleRemoveMember = async () => {
    if (!currentOrganization || !selectedMemberId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/trpc/organization.removeMember', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: {
            organizationId: currentOrganization.id,
            userId: selectedMemberId,
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove member');
      }
      
      await fetchMembers();
      await refreshOrganizations();
      
      toast({
        title: "Success",
        description: "Member removed from organization",
      });
      
      setIsRemoveDialogOpen(false);
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Open the update role dialog for a specific member
  const openUpdateRoleDialog = (memberId: string, currentRole: string) => {
    setSelectedMemberId(memberId);
    updateRoleForm.reset({ role: currentRole as "member" | "admin" | "owner" });
    setIsUpdateDialogOpen(true);
  };

  // Open the remove member dialog for a specific member
  const openRemoveMemberDialog = (memberId: string) => {
    setSelectedMemberId(memberId);
    setIsRemoveDialogOpen(true);
  };

  if (!currentOrganization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
          <CardDescription>No organization selected</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Organization Members</CardTitle>
            <CardDescription>
              Manage members of your organization
            </CardDescription>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>Invite Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a New Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your organization.
                </DialogDescription>
              </DialogHeader>
              <Form {...inviteForm}>
                <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                  <FormField
                    control={inviteForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          The email address of the person you want to invite.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={inviteForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The role determines what permissions the member will have.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Sending..." : "Send Invitation"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-center py-4">Loading members...</p>}
          
          {!isLoading && members.length === 0 && (
            <p className="text-center py-4 text-muted-foreground">
              No members found. Invite someone to get started.
            </p>
          )}
          
          {!isLoading && members.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <UserIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p>{member.user?.name || member.invitedEmail}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.user?.email || member.invitedEmail}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        member.role === "owner" 
                          ? "default" 
                          : member.role === "admin" 
                            ? "outline" 
                            : "secondary"
                      }>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.inviteAccepted ? (
                        <div className="flex items-center">
                          <CheckIcon className="h-4 w-4 text-green-500 mr-1" />
                          <span>Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <XIcon className="h-4 w-4 text-amber-500 mr-1" />
                          <span>Pending</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontalIcon className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openUpdateRoleDialog(member.userId || member.id, member.role)}
                          >
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => openRemoveMemberDialog(member.userId || member.id)}
                          >
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Update Role Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Member Role</DialogTitle>
            <DialogDescription>
              Change the role and permissions for this member.
            </DialogDescription>
          </DialogHeader>
          <Form {...updateRoleForm}>
            <form onSubmit={updateRoleForm.handleSubmit(onUpdateRoleSubmit)} className="space-y-4">
              <FormField
                control={updateRoleForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The role determines what permissions the member will have.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Role"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member from the organization?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleRemoveMember}
              disabled={isLoading}
              variant="destructive"
            >
              {isLoading ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 