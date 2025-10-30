import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./Dialog";
import { Input } from "./Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./Select";
import { Button } from "./Button";
import { UserRoleArrayValues } from "../helpers/schema";
import type { OutputType as UsersOutputType } from "../endpoints/admin/users_GET.schema";
import styles from "./EditUserDialog.module.css";

type User = UsersOutputType[0];

export const editUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  displayName: z.string().min(1, "Display name is required"),
  role: z.enum(UserRoleArrayValues),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditUserFormValues) => void;
  className?: string;
}

export const EditUserDialog: React.FC<EditUserDialogProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
  className,
}) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
  });

  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      });
    }
  }, [user, reset]);

  const onSubmit = (data: EditUserFormValues) => {
    onSave(data);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update the details for {user.email}. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formField}>
            <label htmlFor="email">Email</label>
            <Input id="email" {...register("email")} />
            {errors.email && (
              <p className={styles.errorText}>{errors.email.message}</p>
            )}
          </div>
          <div className={styles.formField}>
            <label htmlFor="displayName">Display Name</label>
            <Input id="displayName" {...register("displayName")} />
            {errors.displayName && (
              <p className={styles.errorText}>{errors.displayName.message}</p>
            )}
          </div>
          <div className={styles.formField}>
            <label htmlFor="role">Role</label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {UserRoleArrayValues.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className={styles.errorText}>{errors.role.message}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};