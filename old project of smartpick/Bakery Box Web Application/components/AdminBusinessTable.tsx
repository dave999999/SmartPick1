import React, { useState } from "react";
import {
  useAdminBusinesses,
  useApproveBusiness,
  useRejectBusiness,
  useUpdateBusiness,
  useDeleteBusiness,
} from "../helpers/useAdminQueries";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Pencil,
  Trash,
} from "lucide-react";
import { Skeleton } from "./Skeleton";
import { Badge } from "./Badge";
import { Button } from "./Button";
import {
  EditBusinessDialog,
  EditBusinessFormValues,
} from "./EditBusinessDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { OutputType as BusinessesType } from "../endpoints/admin/businesses_GET.schema";
import { useTranslation } from "../helpers/useTranslation";
import styles from "./AdminBusinessTable.module.css";

const AdminBusinessTable = () => {
  const { data: businesses, isFetching, error } = useAdminBusinesses();
  const approveMutation = useApproveBusiness();
  const rejectMutation = useRejectBusiness();
  const deleteMutation = useDeleteBusiness();
  const updateMutation = useUpdateBusiness();
  const { t } = useTranslation();
  const [editingBusiness, setEditingBusiness] = useState<
    BusinessesType[0] | null
  >(null);
  const [deletingBusiness, setDeletingBusiness] = useState<
    BusinessesType[0] | null
  >(null);

  const getStatusBadge = (status: BusinessesType[0]["status"]) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">{t("admin.status")}</Badge>;
      case "pending":
        return <Badge variant="warning">{t("admin.status")}</Badge>;
      case "rejected":
        return <Badge variant="destructive">{t("admin.status")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDelete = () => {
    if (!deletingBusiness) return;
    deleteMutation.mutate(
      { businessId: deletingBusiness.id },
      {
        onSuccess: () => {
          setDeletingBusiness(null);
        },
      }
    );
  };

  const handleBusinessUpdate = (data: EditBusinessFormValues) => {
    if (!editingBusiness) return;
    updateMutation.mutate(
      {
        businessId: editingBusiness.id,
        name: data.name,
        description: data.description,
        businessType: data.businessType,
        address: data.address,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        phone: data.phone ?? null,
        logoUrl: data.logoUrl ?? null,
        status: data.status,
      },
      {
        onSuccess: () => {
          setEditingBusiness(null);
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
              <th>{t("admin.businessName")}</th>
              <th>{t("admin.owner")}</th>
              <th>{t("partnerRegister.businessType")}</th>
              <th>{t("admin.status")}</th>
              <th>{t("orders.orderDate")}</th>
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
              <th>{t("admin.businessName")}</th>
              <th>{t("admin.owner")}</th>
              <th>{t("partnerRegister.businessType")}</th>
              <th>{t("admin.status")}</th>
              <th>{t("orders.orderDate")}</th>
              <th>{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {businesses?.map((business) => (
              <tr key={business.id}>
                <td>{business.name}</td>
                <td>{business.ownerDisplayName}</td>
                <td>{business.businessType}</td>
                <td>{getStatusBadge(business.status)}</td>
                <td>
                  {business.createdAt
                    ? new Date(business.createdAt).toLocaleDateString()
                    : "N/A"}
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    {business.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            approveMutation.mutate({ businessId: business.id })
                          }
                          disabled={
                            approveMutation.isPending || rejectMutation.isPending
                          }
                        >
                          <CheckCircle size={16} /> {t("admin.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            rejectMutation.mutate({ businessId: business.id })
                          }
                          disabled={
                            approveMutation.isPending || rejectMutation.isPending
                          }
                        >
                          <XCircle size={16} /> {t("admin.reject")}
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingBusiness(business)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingBusiness(business)}
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
      <EditBusinessDialog
        business={editingBusiness}
        isOpen={!!editingBusiness}
        onClose={() => setEditingBusiness(null)}
        onSave={handleBusinessUpdate}
      />
      <DeleteConfirmDialog
        isOpen={!!deletingBusiness}
        onClose={() => setDeletingBusiness(null)}
        onConfirm={handleDelete}
        title="ბიზნესის წაშლა"
        description="დარწმუნებული ხართ რომ გსურთ ამ ბიზნესის წაშლა? ეს მოქმედება შეუქცევადია."
        itemName={deletingBusiness?.name ?? ""}
      />
    </>
  );
};

export default AdminBusinessTable;