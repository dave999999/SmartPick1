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
import { ProductStatusArrayValues } from "../helpers/schema";
import type { OutputType as ProductsOutputType } from "../endpoints/admin/products_GET.schema";
import styles from "./EditProductDialog.module.css";

type Product = ProductsOutputType[0];

export const editProductSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  originalPrice: z.coerce.number().positive("Original price must be positive"),
  discountedPrice: z.coerce
    .number()
    .positive("Discounted price must be positive"),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  imageUrl: z.string().url("Must be a valid URL").nullable().optional(),
  pickupTimeStart: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
  pickupTimeEnd: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
  availableDate: z.string().min(1, "Available date is required"),
  status: z.enum(ProductStatusArrayValues),
  expiresAt: z.string().nullable().optional(),
});

export type EditProductFormValues = z.infer<typeof editProductSchema>;

interface EditProductDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditProductFormValues) => void;
  className?: string;
}

const formatDateForInput = (date: Date | string | null): string => {
  if (!date) return "";
  try {
    const d = new Date(date);
    // Check if the date is valid
    if (isNaN(d.getTime())) {
      return "";
    }
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("Error formatting date:", e);
    return "";
  }
};

const formatDateTimeForInput = (date: Date | string | null): string => {
  if (!date) return "";
  try {
    const d = new Date(date);
    // Check if the date is valid
    if (isNaN(d.getTime())) {
      return "";
    }
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (e) {
    console.error("Error formatting datetime:", e);
    return "";
  }
};

export const EditProductDialog: React.FC<EditProductDialogProps> = ({
  product,
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
  } = useForm<EditProductFormValues>({
    resolver: zodResolver(editProductSchema),
  });

  useEffect(() => {
    if (product) {
      reset({
        title: product.title,
        description: product.description,
        originalPrice: Number(product.originalPrice),
        discountedPrice: Number(product.discountedPrice),
        quantity: product.quantity,
        imageUrl: product.imageUrl,
        pickupTimeStart: product.pickupTimeStart,
        pickupTimeEnd: product.pickupTimeEnd,
        availableDate: formatDateForInput(product.availableDate),
        status: product.status ?? "available",
        expiresAt: formatDateTimeForInput(product.expiresAt),
      });
    }
  }, [product, reset]);

  const onSubmit = (data: EditProductFormValues) => {
    onSave(data);
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${styles.dialogContent} ${className || ""}`}>
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the details for "{product.title}". Click save when you're
            done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label htmlFor="title">Title</label>
              <Input id="title" {...register("title")} />
              {errors.title && (
                <p className={styles.errorText}>{errors.title.message}</p>
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

            <div className={styles.formField}>
              <label htmlFor="originalPrice">Original Price</label>
              <Input
                id="originalPrice"
                type="number"
                step="0.01"
                {...register("originalPrice")}
              />
              {errors.originalPrice && (
                <p className={styles.errorText}>
                  {errors.originalPrice.message}
                </p>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor="discountedPrice">Discounted Price</label>
              <Input
                id="discountedPrice"
                type="number"
                step="0.01"
                {...register("discountedPrice")}
              />
              {errors.discountedPrice && (
                <p className={styles.errorText}>
                  {errors.discountedPrice.message}
                </p>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor="quantity">Quantity</label>
              <Input
                id="quantity"
                type="number"
                step="1"
                {...register("quantity")}
              />
              {errors.quantity && (
                <p className={styles.errorText}>{errors.quantity.message}</p>
              )}
            </div>

            <div className={styles.formField}>
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
                      {ProductStatusArrayValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
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

            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label htmlFor="imageUrl">Image URL</label>
              <Input id="imageUrl" {...register("imageUrl")} />
              {errors.imageUrl && (
                <p className={styles.errorText}>{errors.imageUrl.message}</p>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor="pickupTimeStart">Pickup Start Time</label>
              <Input
                id="pickupTimeStart"
                type="time"
                {...register("pickupTimeStart")}
              />
              {errors.pickupTimeStart && (
                <p className={styles.errorText}>
                  {errors.pickupTimeStart.message}
                </p>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor="pickupTimeEnd">Pickup End Time</label>
              <Input
                id="pickupTimeEnd"
                type="time"
                {...register("pickupTimeEnd")}
              />
              {errors.pickupTimeEnd && (
                <p className={styles.errorText}>
                  {errors.pickupTimeEnd.message}
                </p>
              )}
            </div>

            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label htmlFor="availableDate">Available Date</label>
              <Input
                id="availableDate"
                type="date"
                {...register("availableDate")}
              />
              {errors.availableDate && (
                <p className={styles.errorText}>
                  {errors.availableDate.message}
                </p>
              )}
            </div>

            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label htmlFor="expiresAt">Expires At</label>
              <Input
                id="expiresAt"
                type="datetime-local"
                {...register("expiresAt")}
              />
              <p className={styles.description}>
                Product will automatically be removed after this time
              </p>
              {errors.expiresAt && (
                <p className={styles.errorText}>
                  {errors.expiresAt.message}
                </p>
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