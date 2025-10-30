import React, { useState } from "react";
import {
  useAdminUsers,
  useDeleteUser,
  useUpdateUser,
} from "../helpers/useAdminQueries";
import { AlertCircle, Pencil, Trash } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { EditUserDialog } from "./EditUserDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { OutputType as UsersType } from "../endpoints/admin/users_GET.schema";
import { useTranslation } from "../helpers/useTranslation";
import styles from "./AdminPartnerTable.module.css";

const AdminPartnerTable = () => {
  const { data: users, isFetching, error } = useAdminUsers();
  const deleteMutation = useDeleteUser();
  const updateMutation = useUpdateUser();
  const { t } = useTranslation();
  const [editingUser, setEditingUser] = useState<UsersType[0] | null>(null);
  const [deletingUser, setDeletingUser] = useState<UsersType[0] | null>(null);

  const partners = users?.filter(
    (user) => user.role === "partner" || user.role === "admin"
  );

  const getRoleBadge = (role: UsersType[0]["role"]) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive">Admin</Badge>;
      case "partner":
        return <Badge variant="secondary">Partner</Badge>;
      case "user":
        return <Badge variant="default">User</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const handleDelete = () => {
    if (!deletingUser) return;
    deleteMutation.mutate(
      { userId: deletingUser.id },
      {
        onSuccess: () => {
          setDeletingUser(null);
        },
      }
    );
  };

  const handleUserUpdate = (data: {
    email: string;
    displayName: string;
    role: UsersType[0]["role"];
  }) => {
    if (!editingUser) return;
    updateMutation.mutate(
      {
        userId: editingUser.id,
        ...data,
      },
      {
        onSuccess: () => {
          setEditingUser(null);
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
              <th>{t("auth.emailLabel")}</th>
              <th>{t("partnerRegister.ownerName")}</th>
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
              <th>{t("auth.emailLabel")}</th>
              <th>{t("partnerRegister.ownerName")}</th>
              <th>{t("admin.status")}</th>
              <th>{t("orders.orderDate")}</th>
              <th>{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {partners?.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.displayName}</td>
                <td>{getRoleBadge(user.role)}</td>
                <td>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "N/A"}
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingUser(user)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingUser(user)}
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
      <EditUserDialog
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleUserUpdate}
      />
      <DeleteConfirmDialog
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDelete}
        title="პარტნიორის წაშლა"
        description="დარწმუნებული ხართ რომ გსურთ ამ პარტნიორის წაშლა? ეს მოქმედება შეუქცევადია."
        itemName={deletingUser?.displayName ?? ""}
      />
    </>
  );
};

export default AdminPartnerTable;