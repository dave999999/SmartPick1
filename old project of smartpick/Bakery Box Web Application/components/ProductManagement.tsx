import React, { useState } from "react";
import {
  useGetMyProductsQuery,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from "../helpers/useFoodWasteQueries";
import { MyProduct } from "../endpoints/products/my_GET.schema";
import { schema as updateSchema } from "../endpoints/products/update_POST.schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "./Form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./Dialog";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";
import { ImageUpload } from "./ImageUpload";
import { AlertTriangle, Edit, Save, Trash2, X } from "lucide-react";
import { useTranslation } from "../helpers/useTranslation";
import styles from "./ProductManagement.module.css";
import { z } from "zod";

const ProductEditForm = ({
  product,
  onCancel,
}: {
  product: MyProduct;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const updateMutation = useUpdateProductMutation();
  
  // Calculate hours remaining until expiration
  const calculateHoursRemaining = () => {
    if (!product.expiresAt) return undefined;
    const now = new Date();
    const expiresAt = new Date(product.expiresAt);
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffHours = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
    return diffHours <= 24 ? diffHours : undefined;
  };

  const form = useForm({
    schema: updateSchema,
    defaultValues: {
      productId: product.id,
      title: product.title,
      description: product.description,
      originalPrice: parseFloat(product.originalPrice),
      discountedPrice: parseFloat(product.discountedPrice),
      quantity: product.quantity,
      imageUrl: product.imageUrl ?? "",
      expirationHours: calculateHoursRemaining(),
    },
  });

  const onSubmit = (values: z.infer<typeof updateSchema>) => {
    updateMutation.mutate(values, {
      onSuccess: () => {
        onCancel();
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={styles.editForm}>
        <div className={styles.formGrid}>
          <FormItem name="title" className={styles.span2}>
            <FormLabel>{t("productManagement.title")}</FormLabel>
            <FormControl>
              <Input
                value={form.values.title}
                onChange={(e) =>
                  form.setValues((p) => ({ ...p, title: e.target.value }))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
          <FormItem name="originalPrice">
            <FormLabel>{t("productManagement.originalPrice")}</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                value={form.values.originalPrice}
                onChange={(e) =>
                  form.setValues((p) => ({
                    ...p,
                    originalPrice: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
          <FormItem name="discountedPrice">
            <FormLabel>{t("productManagement.discountedPrice")}</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                value={form.values.discountedPrice}
                onChange={(e) =>
                  form.setValues((p) => ({
                    ...p,
                    discountedPrice: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
          <FormItem name="quantity">
            <FormLabel>{t("productManagement.quantity")}</FormLabel>
            <FormControl>
              <Input
                type="number"
                value={form.values.quantity}
                onChange={(e) =>
                  form.setValues((p) => ({
                    ...p,
                    quantity: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
          <FormItem name="expirationHours">
            <FormLabel>{t("productManagement.expirationHours")}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="1"
                max="24"
                value={form.values.expirationHours ?? ""}
                onChange={(e) =>
                  form.setValues((p) => ({
                    ...p,
                    expirationHours: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
                placeholder="1-24 hours"
              />
            </FormControl>
            <FormDescription>
              {product.expiresAt && (
                <>
                  {t("productManagement.currentExpiration")}{" "}
                  {new Date(product.expiresAt).toLocaleString()}
                </>
              )}
            </FormDescription>
            <FormMessage />
          </FormItem>
          <FormItem name="imageUrl" className={styles.span2}>
            <FormLabel>{t("productManagement.image")}</FormLabel>
            <FormControl>
              <ImageUpload
                value={form.values.imageUrl}
                onChange={(url) =>
                  form.setValues((p) => ({ ...p, imageUrl: url || "" }))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
          <FormItem name="description" className={styles.span2}>
            <FormLabel>{t("productManagement.description")}</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                value={form.values.description}
                onChange={(e) =>
                  form.setValues((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </div>
        <div className={styles.formActions}>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={updateMutation.isPending}
          >
            <X size={16} /> {t("productManagement.cancel")}
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save size={16} /> {t("productManagement.saveChanges")}
          </Button>
        </div>
      </form>
    </Form>
  );
};

const ProductCard = ({
  product,
  isEditing,
  onEdit,
}: {
  product: MyProduct;
  isEditing: boolean;
  onEdit: (id: number | null) => void;
}) => {
  const { t } = useTranslation();
  const deleteMutation = useDeleteProductMutation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = () => {
    deleteMutation.mutate(
      { productId: product.id },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
        },
      }
    );
  };

  if (isEditing) {
    return (
      <div className={styles.card}>
        <ProductEditForm product={product} onCancel={() => onEdit(null)} />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardContent}>
        <img
          src={product.imageUrl || "https://via.placeholder.com/150"}
          alt={product.title}
          className={styles.productImage}
        />
        <div className={styles.productInfo}>
          <h3 className={styles.productTitle}>{product.title}</h3>
          <p className={styles.businessName}>{product.businessName}</p>
          <p className={styles.productDescription}>{product.description}</p>
          <div className={styles.productDetails}>
            <span>
              {t("productManagement.price")}{" "}
              <span className={styles.originalPrice}>
                ${parseFloat(product.originalPrice).toFixed(2)}
              </span>{" "}
              <span className={styles.discountedPrice}>
                ${parseFloat(product.discountedPrice).toFixed(2)}
              </span>
            </span>
            <span>{t("productManagement.quantityLabel")} {product.quantity}</span>
          </div>
        </div>
      </div>
      <div className={styles.cardActions}>
        <Button variant="outline" size="sm" onClick={() => onEdit(product.id)}>
          <Edit size={16} /> {t("productManagement.edit")}
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 size={16} /> {t("productManagement.delete")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("productManagement.areYouSure")}</DialogTitle>
              <DialogDescription>
                {t("productManagement.deleteConfirmation").replace("{title}", product.title)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                disabled={deleteMutation.isPending}
              >
                {t("productManagement.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? t("productManagement.deleting") : t("productManagement.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

const ProductManagementSkeleton = () => (
  <div className={styles.card}>
    <div className={styles.cardContent}>
      <Skeleton className={styles.productImage} />
      <div className={styles.productInfo}>
        <Skeleton style={{ height: "1.5rem", width: "80%" }} />
        <Skeleton style={{ height: "1rem", width: "50%", marginTop: "0.5rem" }} />
        <Skeleton style={{ height: "1rem", width: "90%", marginTop: "1rem" }} />
        <Skeleton style={{ height: "1rem", width: "95%", marginTop: "0.25rem" }} />
        <div className={styles.productDetails} style={{ marginTop: "1rem" }}>
          <Skeleton style={{ height: "1rem", width: "120px" }} />
          <Skeleton style={{ height: "1rem", width: "80px" }} />
        </div>
      </div>
    </div>
    <div className={styles.cardActions}>
      <Skeleton style={{ height: "1.75rem", width: "80px" }} />
      <Skeleton style={{ height: "1.75rem", width: "80px" }} />
    </div>
  </div>
);

export const ProductManagement = () => {
  const { t } = useTranslation();
  const { data, isFetching, error } = useGetMyProductsQuery();
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  if (isFetching) {
    return (
      <div className={styles.container}>
        <ProductManagementSkeleton />
        <ProductManagementSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <AlertTriangle size={48} />
        <h3>{t("productManagement.errorLoading")}</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3>{t("productManagement.noProductsFound")}</h3>
        <p>
          {t("productManagement.noProductsDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {data.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isEditing={editingProductId === product.id}
          onEdit={setEditingProductId}
        />
      ))}
    </div>
  );
};