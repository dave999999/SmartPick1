import React, { useEffect, useRef } from "react";
import { useForm } from "./Form";
import { schema as createProductSchema } from "../endpoints/products/create_POST.schema";
import { z } from "zod";
import { useCreateProductMutation } from "../helpers/useFoodWasteQueries";
import {
  Form,
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "./Form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./Select";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Button } from "./Button";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "./Calendar";
import { Skeleton } from "./Skeleton";
import { ImageUpload } from "./ImageUpload";
import { BUSINESS_CATEGORIES, getBusinessEmoji } from "../helpers/businessCategories";
import { useTranslation } from "../helpers/useTranslation";
import { Separator } from "./Separator";
import styles from "./AddProductForm.module.css";

type FormSchema = z.infer<typeof createProductSchema>;

export const AddProductForm = () => {
  const { t } = useTranslation();
  const createProductMutation = useCreateProductMutation();

  const form = useForm({
    schema: createProductSchema,
    defaultValues: {
      title: "",
      description: "",
      originalPrice: undefined,
      discountedPrice: undefined,
      quantity: 1,
      expirationHours: 9,
      imageUrl: undefined,
      pickupTimeStart: "16:00",
      pickupTimeEnd: "18:00",
      availableDate: new Date().toISOString().split("T")[0],
      businessType: undefined,
    },
  });

  // Type-safe helper to update form values
  const updateFormValue = <K extends keyof FormSchema>(
    key: K,
    value: FormSchema[K]
  ) =>
    form.setValues((prev) => {
      const next: FormSchema = { ...prev, [key]: value };
      return next;
    });

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (createProductMutation.isSuccess) {
      formRef.current?.reset();
      // Reset the native form state to clear inputs visually
      formRef.current?.reset();
    }
  }, [createProductMutation.isSuccess, form]);

  const onSubmit = (values: FormSchema) => {
    createProductMutation.mutate(values);
  };

  return (
    <div className={styles.formContainer}>
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className={styles.form}
        >
          <FormItem name="businessType">
            <FormLabel>Business Type</FormLabel>
            <FormControl>
              <Select
                value={form.values.businessType}
                onValueChange={(value) =>
                  updateFormValue("businessType", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bakery">🍞 Bakeries</SelectItem>
                  <SelectItem value="grocery">🛒 Groceries</SelectItem>
                  <SelectItem value="restaurant">🍔 Restaurants</SelectItem>
                  <SelectItem value="coffee">☕ Cafes</SelectItem>
                  <SelectItem value="streetfood">🍕 Street Food</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem name="title">
            <FormLabel>Product Title</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Morning Pastry Box"
                value={form.values.title}
                onChange={(e) => updateFormValue("title", e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem name="description">
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe the contents of the mystery box."
                value={form.values.description}
                onChange={(e) => updateFormValue("description", e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <div className={styles.grid}>
            <FormItem name="originalPrice">
              <FormLabel>Original Price ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="15.00"
                  value={form.values.originalPrice || ""}
                  onChange={(e) =>
                    updateFormValue(
                      "originalPrice",
                      e.target.value ? parseFloat(e.target.value) : 0
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            <FormItem name="discountedPrice">
              <FormLabel>Discounted Price ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="5.00"
                  value={form.values.discountedPrice || ""}
                  onChange={(e) =>
                    updateFormValue(
                      "discountedPrice",
                      e.target.value ? parseFloat(e.target.value) : 0
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </div>

          <FormItem name="quantity">
            <FormLabel>Quantity Available</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="1"
                value={form.values.quantity}
                onChange={(e) =>
                  updateFormValue("quantity", parseInt(e.target.value, 10))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem name="expirationHours">
            <FormLabel>Hours Until Auto-Delist</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="1"
                max="24"
                step="1"
                value={form.values.expirationHours}
                onChange={(e) =>
                  updateFormValue("expirationHours", parseInt(e.target.value, 10))
                }
              />
            </FormControl>
            <FormDescription>
              Product will automatically be removed after this many hours (1-24 hours)
            </FormDescription>
            <FormMessage />
          </FormItem>

          <FormItem name="imageUrl">
            <FormLabel>Product Image</FormLabel>
            <FormControl>
              <ImageUpload
                value={form.values.imageUrl || null}
                onChange={(url) => updateFormValue("imageUrl", url || undefined)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <div className={styles.grid}>
            <FormItem name="pickupTimeStart">
              <FormLabel>Pickup Start Time</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  value={form.values.pickupTimeStart}
                  onChange={(e) =>
                    updateFormValue("pickupTimeStart", e.target.value)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            <FormItem name="pickupTimeEnd">
              <FormLabel>Pickup End Time</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  value={form.values.pickupTimeEnd}
                  onChange={(e) =>
                    updateFormValue("pickupTimeEnd", e.target.value)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </div>

          <FormItem name="availableDate">
            <FormLabel>Available Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant="outline" className={styles.datePickerTrigger}>
                    <span>
                      {form.values.availableDate
                        ? new Date(
                            form.values.availableDate + "T00:00:00"
                          ).toLocaleDateString()
                        : "Select a date"}
                    </span>
                    <CalendarIcon size={16} />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent removeBackgroundAndPadding>
                <Calendar
                  mode="single"
                  selected={new Date(form.values.availableDate + "T00:00:00")}
                  onSelect={(date) =>
                    date &&
                    updateFormValue(
                      "availableDate",
                      date.toISOString().split("T")[0]
                    )
                  }
                  disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>

          <Button
            type="submit"
            disabled={createProductMutation.isPending}
            className={styles.submitButton}
          >
            {createProductMutation.isPending && (
              <Loader2 className={styles.spinner} size={18} />
            )}
            List Product
          </Button>
        </form>
      </Form>
    </div>
  );
};

const AddProductFormSkeleton = () => (
  <div className={styles.formContainer}>
    <div className={styles.form}>
      <Skeleton style={{ height: "2.5rem", marginBottom: "1.5rem" }} />
      <Skeleton style={{ height: "2.5rem", marginBottom: "1.5rem" }} />
      <Skeleton style={{ height: "6rem", marginBottom: "1.5rem" }} />
      <div className={styles.grid}>
        <Skeleton style={{ height: "2.5rem" }} />
        <Skeleton style={{ height: "2.5rem" }} />
      </div>
      <Skeleton style={{ height: "2.5rem", marginTop: "1.5rem" }} />
      <Skeleton style={{ height: "2.5rem", marginTop: "1.5rem" }} />
      <div className={styles.grid} style={{ marginTop: "1.5rem" }}>
        <Skeleton style={{ height: "2.5rem" }} />
        <Skeleton style={{ height: "2.5rem" }} />
      </div>
      <Skeleton style={{ height: "2.5rem", marginTop: "1.5rem" }} />
      <Skeleton style={{ height: "2.5rem", width: "8rem", marginTop: "1.5rem" }} />
    </div>
  </div>
);