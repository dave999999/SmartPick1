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
import { Textarea } from "./Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./Select";
import { Button } from "./Button";
import { BusinessStatusArrayValues } from "../helpers/schema";
import { getBusinessCategoryOptions } from "../helpers/businessCategories";
import type { OutputType as BusinessesOutputType } from "../endpoints/admin/businesses_GET.schema";
import styles from "./EditBusinessDialog.module.css";

type Business = BusinessesOutputType[0];

export const editBusinessSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  description: z.string().min(1, "Description is required"),
  businessType: z.string().min(1, "Business type is required"),
  address: z.string().min(1, "Address is required"),
  latitude: z.coerce.number().nullable().optional(),
  longitude: z.coerce.number().nullable().optional(),
  phone: z.string().nullable().optional(),
  logoUrl: z.string().url("Must be a valid URL").nullable().optional(),
  status: z.enum(BusinessStatusArrayValues),
});

export type EditBusinessFormValues = z.infer<typeof editBusinessSchema>;

interface EditBusinessDialogProps {
  business: Business | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditBusinessFormValues) => void;
  className?: string;
}

export const EditBusinessDialog: React.FC<EditBusinessDialogProps> = ({
  business,
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
  } = useForm<EditBusinessFormValues>({
    resolver: zodResolver(editBusinessSchema),
  });

  useEffect(() => {
    if (business) {
      reset({
        name: business.name,
        description: business.description,
        businessType: business.businessType,
        address: business.address,
        latitude: business.latitude ? Number(business.latitude) : null,
        longitude: business.longitude ? Number(business.longitude) : null,
        phone: business.phone,
        logoUrl: business.logoUrl,
        status: business.status,
      });
    }
  }, [business, reset]);

  const onSubmit = (data: EditBusinessFormValues) => {
    onSave(data);
  };

  if (!business) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${styles.dialogContent} ${className || ""}`}>
        <DialogHeader>
          <DialogTitle>Edit Business</DialogTitle>
          <DialogDescription>
            Update the details for "{business.name}". Click save when you're
            done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="name">Name</label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className={styles.errorText}>{errors.name.message}</p>
              )}
            </div>
            <div className={styles.formField}>
              <label htmlFor="businessType">Business Type</label>
              <Controller
                name="businessType"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger id="businessType">
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getBusinessCategoryOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.businessType && (
                <p className={styles.errorText}>
                  {errors.businessType.message}
                </p>
              )}
            </div>
            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label htmlFor="description">Description</label>
              <Textarea id="description" {...register("description")} />
              {errors.description && (
                <p className={styles.errorText}>
                  {errors.description.message}
                </p>
              )}
            </div>
            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label htmlFor="address">Address</label>
              <Input id="address" {...register("address")} />
              {errors.address && (
                <p className={styles.errorText}>{errors.address.message}</p>
              )}
            </div>
            <div className={styles.formField}>
              <label htmlFor="latitude">Latitude</label>
              <Input
                id="latitude"
                type="number"
                step="any"
                {...register("latitude")}
              />
              {errors.latitude && (
                <p className={styles.errorText}>{errors.latitude.message}</p>
              )}
            </div>
            <div className={styles.formField}>
              <label htmlFor="longitude">Longitude</label>
              <Input
                id="longitude"
                type="number"
                step="any"
                {...register("longitude")}
              />
              {errors.longitude && (
                <p className={styles.errorText}>{errors.longitude.message}</p>
              )}
            </div>
            <div className={styles.formField}>
              <label htmlFor="phone">Phone</label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && (
                <p className={styles.errorText}>{errors.phone.message}</p>
              )}
            </div>
            <div className={styles.formField}>
              <label htmlFor="logoUrl">Logo URL</label>
              <Input id="logoUrl" {...register("logoUrl")} />
              {errors.logoUrl && (
                <p className={styles.errorText}>{errors.logoUrl.message}</p>
              )}
            </div>
            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label htmlFor="status">Status</label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      {BusinessStatusArrayValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <p className={styles.errorText}>{errors.status.message}</p>
              )}
            </div>
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