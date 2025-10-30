import React, { useState } from "react";
import {
  useAdminProducts,
  useDeleteProduct,
  useUpdateProduct,
} from "../helpers/useAdminQueries";
import { AlertCircle, Pencil, Trash } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { Badge } from "./Badge";
import { Button } from "./Button";
import {
  EditProductDialog,
  EditProductFormValues,
} from "./EditProductDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { OutputType as ProductsType } from "../endpoints/admin/products_GET.schema";
import { useTranslation } from "../helpers/useTranslation";
import styles from "./AdminProductsTable.module.css";

const AdminProductsTable = () => {
  const { data: products, isFetching, error } = useAdminProducts();
  const deleteMutation = useDeleteProduct();
  const updateMutation = useUpdateProduct();
  const { t } = useTranslation();
  const [editingProduct, setEditingProduct] = useState<ProductsType[0] | null>(
    null
  );
  const [deletingProduct, setDeletingProduct] = useState<
    ProductsType[0] | null
  >(null);

  const getStatusBadge = (status: ProductsType[0]["status"]) => {
    switch (status) {
      case "available":
        return <Badge variant="success">Available</Badge>;
      case "sold_out":
        return <Badge variant="warning">Sold Out</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDelete = () => {
    if (!deletingProduct) return;
    deleteMutation.mutate(
      { productId: deletingProduct.id },
      {
        onSuccess: () => {
          setDeletingProduct(null);
        },
      }
    );
  };

  const handleProductUpdate = (data: EditProductFormValues) => {
    if (!editingProduct) return;
    updateMutation.mutate(
      {
        productId: editingProduct.id,
        title: data.title,
        description: data.description,
        originalPrice: data.originalPrice,
        discountedPrice: data.discountedPrice,
        quantity: data.quantity,
        imageUrl: data.imageUrl ?? null,
        pickupTimeStart: data.pickupTimeStart,
        pickupTimeEnd: data.pickupTimeEnd,
        availableDate: new Date(data.availableDate),
        status: data.status,
      },
      {
        onSuccess: () => {
          setEditingProduct(null);
        },
      }
    );
  };

  if (isFetching) {
    return (
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Business Name</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Created Date</th>
              <th>{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td>
                  <Skeleton />
                </td>
                <td>
                  <Skeleton />
                </td>
                <td>
                  <Skeleton />
                </td>
                <td>
                  <Skeleton />
                </td>
                <td>
                  <Skeleton />
                </td>
                <td>
                  <Skeleton />
                </td>
                <td>
                  <Skeleton />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <AlertCircle /> {t("common.error")}
      </div>
    );
  }

  return (
    <>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Business Name</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Created Date</th>
              <th>{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((product) => (
              <tr key={product.id}>
                <td>{product.title}</td>
                <td>{product.businessName}</td>
                <td>
                  ${Number(product.discountedPrice).toFixed(2)}
                  <span className={styles.originalPrice}>
                    ${Number(product.originalPrice).toFixed(2)}
                  </span>
                </td>
                <td>{product.quantity}</td>
                <td>{getStatusBadge(product.status)}</td>
                <td>
                  {product.createdAt
                    ? new Date(product.createdAt).toLocaleDateString()
                    : "N/A"}
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingProduct(product)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingProduct(product)}
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <EditProductDialog
        product={editingProduct}
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={handleProductUpdate}
      />
      <DeleteConfirmDialog
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
        title="პროდუქტის წაშლა"
        description="დარწმუნებული ხართ რომ გსურთ ამ პროდუქტის წაშლა? ეს მოქმედება შეუქცევადია."
        itemName={deletingProduct?.title ?? ""}
      />
    </>
  );
};

export default AdminProductsTable;