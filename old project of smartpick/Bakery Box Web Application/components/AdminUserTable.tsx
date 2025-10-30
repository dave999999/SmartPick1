import React, { useState, useMemo } from "react";
import {
  useAdminUsers,
  useDeleteUser,
  useUpdateUser,
} from "../helpers/useAdminQueries";
import { AlertCircle, Pencil, Trash, AlertTriangle } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { EditUserDialog } from "./EditUserDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import { OutputType as UsersType } from "../endpoints/admin/users_GET.schema";
import { useTranslation } from "../helpers/useTranslation";
import styles from "./AdminUserTable.module.css";

const AdminUserTable = () => {
  const { data: users, isFetching, error } = useAdminUsers();
  const deleteMutation = useDeleteUser();
  const updateMutation = useUpdateUser();
  const { t } = useTranslation();
  const [editingUser, setEditingUser] = useState<UsersType[0] | null>(null);
  const [deletingUser, setDeletingUser] = useState<UsersType[0] | null>(null);
  const [showSuspiciousOnly, setShowSuspiciousOnly] = useState(false);

  const isSuspicious = (user: UsersType[0]) => {
    return user.fraudScore > 50 && user.totalReservations >= 3;
  };

  const getFraudScoreVariant = (
    score: number
  ): "success" | "warning" | "destructive" => {
    if (score <= 20) return "success";
    if (score <= 50) return "warning";
    return "destructive";
  };

  const regularUsers = useMemo(() => {
    if (!users) return [];
    
    let filtered = users.filter((user) => user.role === "user");
    
    if (showSuspiciousOnly) {
      filtered = filtered.filter(isSuspicious);
    }
    
    // Sort by fraud score (highest first)
    return filtered.sort((a, b) => b.fraudScore - a.fraudScore);
  }, [users, showSuspiciousOnly]);

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
              <th>Total Reservations</th>
              <th>Fraud Score</th>
              <th>Status</th>
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

  const suspiciousCount = users?.filter(
    (user) => user.role === "user" && isSuspicious(user)
  ).length || 0;

  return (
    <>
      <div className={styles.controlsContainer}>
        <div className={styles.filterToggle}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showSuspiciousOnly}
              onChange={(e) => setShowSuspiciousOnly(e.target.checked)}
              className={styles.checkbox}
            />
            <span>Show Suspicious Users Only</span>
            {suspiciousCount > 0 && (
              <Badge variant="destructive">{suspiciousCount}</Badge>
            )}
          </label>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("auth.emailLabel")}</th>
              <th>{t("partnerRegister.ownerName")}</th>
              <th>{t("admin.status")}</th>
              <th>Total Reservations</th>
              <th className={styles.fraudScoreHeader}>Fraud Score</th>
              <th>Status</th>
              <th>{t("orders.orderDate")}</th>
              <th>{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {regularUsers?.map((user) => {
              const suspicious = isSuspicious(user);
              return (
                <tr
                  key={user.id}
                  className={suspicious ? styles.suspiciousRow : ""}
                >
                  <td>{user.email}</td>
                  <td>{user.displayName}</td>
                  <td>{getRoleBadge(user.role)}</td>
                  <td className={styles.centeredCell}>
                    {user.totalReservations}
                  </td>
                  <td className={styles.centeredCell}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={styles.fraudScoreContainer}>
                          <Badge
                            variant={getFraudScoreVariant(user.fraudScore)}
                          >
                            {user.fraudScore.toFixed(1)}%
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className={styles.fraudTooltip}>
                          <div className={styles.tooltipTitle}>
                            Reservation Breakdown
                          </div>
                          <div className={styles.tooltipRow}>
                            <span>Redeemed:</span>
                            <span className={styles.tooltipValue}>
                              {user.redeemedReservations}
                            </span>
                          </div>
                          <div className={styles.tooltipRow}>
                            <span>Expired:</span>
                            <span className={styles.tooltipValue}>
                              {user.expiredReservations}
                            </span>
                          </div>
                          <div className={styles.tooltipRow}>
                            <span>Cancelled:</span>
                            <span className={styles.tooltipValue}>
                              {user.cancelledReservations}
                            </span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className={styles.centeredCell}>
                    {suspicious ? (
                      <Badge variant="warning">
                        <AlertTriangle size={14} />
                        <span style={{ marginLeft: "0.25rem" }}>
                          Suspicious
                        </span>
                      </Badge>
                    ) : (
                      <Badge variant="success">Normal</Badge>
                    )}
                  </td>
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
              );
            })}
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
        title="მომხმარებლის წაშლა"
        description="დარწმუნებული ხართ რომ გსურთ ამ მომხმარებლის წაშლა? ეს მოქმედება შეუქცევადია."
        itemName={deletingUser?.displayName ?? ""}
      />
    </>
  );
};

export default AdminUserTable;