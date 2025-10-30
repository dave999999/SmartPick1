import React from "react";
import { z } from "zod";
import {
  useForm,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "./Form";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Button } from "./Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./Select";
import { useCreateBusinessMutation } from "../helpers/useFoodWasteQueries";
import { schema as createBusinessSchema } from "../endpoints/businesses/create_POST.schema";
import { getBusinessCategoryOptions } from "../helpers/businessCategories";
import styles from "./BusinessRegistrationForm.module.css";

type BusinessRegistrationFormProps = {
  onSuccess?: () => void;
  className?: string;
};

export const BusinessRegistrationForm = ({
  onSuccess,
  className,
}: BusinessRegistrationFormProps) => {
  const createBusinessMutation = useCreateBusinessMutation();

  const form = useForm({
    schema: createBusinessSchema,
    defaultValues: {
      name: "",
      description: "",
      address: "",
      latitude: undefined,
      longitude: undefined,
      contactPhone: "",
      businessType: "",
    },
  });

      const onSubmit = async (values: z.infer<typeof createBusinessSchema>) => {
    await createBusinessMutation.mutateAsync(values, {
      onSuccess: () => {
        form.setValues({
          name: "",
          description: "",
          address: "",
          latitude: 0,
          longitude: 0,
          contactPhone: "",
          businessType: "",
        });
        if (onSuccess) {
          onSuccess();
        }
      },
    });
  };

  return (
    <div className={`${styles.formContainer} ${className || ""}`}>
      <h2 className={styles.title}>Register Your Business</h2>
      <p className={styles.subtitle}>
        Fill out the details below to get your business listed on SmartPick.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
          <FormItem name="name">
            <FormLabel>Business Name</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., The Corner Bakery"
                value={form.values.name}
                onChange={(e) =>
                  form.setValues((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem name="businessType">
            <FormLabel>Business Type</FormLabel>
            <FormControl>
              <Select
                value={form.values.businessType}
                onValueChange={(value) =>
                  form.setValues((prev) => ({
                    ...prev,
                    businessType: value,
                  }))
                }
              >
                <SelectTrigger>
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
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem name="description">
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Tell us about your business..."
                value={form.values.description}
                onChange={(e) =>
                  form.setValues((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem name="address">
            <FormLabel>Full Address</FormLabel>
            <FormControl>
              <Input
                placeholder="123 Main St, Anytown, USA 12345"
                value={form.values.address}
                onChange={(e) =>
                  form.setValues((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <div className={styles.grid}>
            <FormItem name="latitude">
              <FormLabel>Latitude</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 40.7128"
                  value={form.values.latitude ?? ""}
                  onChange={(e) =>
                    form.setValues((prev) => ({
                      ...prev,
                      latitude: e.target.valueAsNumber,
                    }))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            <FormItem name="longitude">
              <FormLabel>Longitude</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., -74.0060"
                  value={form.values.longitude ?? ""}
                  onChange={(e) =>
                    form.setValues((prev) => ({
                      ...prev,
                      longitude: e.target.valueAsNumber,
                    }))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </div>
          <FormDescription>
            You can find coordinates by searching your address on Google Maps.
          </FormDescription>

          <FormItem name="contactPhone">
            <FormLabel>Contact Phone</FormLabel>
            <FormControl>
              <Input
                placeholder="+1234567890"
                value={form.values.contactPhone}
                onChange={(e) =>
                  form.setValues((prev) => ({
                    ...prev,
                    contactPhone: e.target.value,
                  }))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <Button
            type="submit"
            disabled={createBusinessMutation.isPending}
            className={styles.submitButton}
          >
            {createBusinessMutation.isPending
              ? "Registering..."
              : "Register Business"}
          </Button>
        </form>
      </Form>
    </div>
  );
};