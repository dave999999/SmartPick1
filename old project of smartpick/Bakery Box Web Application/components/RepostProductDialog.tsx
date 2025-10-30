import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import styles from './RepostProductDialog.module.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './Dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from './Form';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { useRepostProductMutation } from '../helpers/useFoodWasteQueries';
import { schema as repostSchema } from '../endpoints/products/repost_POST.schema';
import type { MyProduct } from '../endpoints/products/my_GET.schema';

interface RepostProductDialogProps {
  product: MyProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RepostProductDialog = ({ product, isOpen, onClose }: RepostProductDialogProps) => {
  const [reuseInfo, setReuseInfo] = useState(true);
  const repostMutation = useRepostProductMutation();

  const form = useForm({
    schema: repostSchema,
    defaultValues: {
      productId: product?.id,
      title: product?.title,
      description: product?.description,
      originalPrice: product ? Number(product.originalPrice) : undefined,
      discountedPrice: product ? Number(product.discountedPrice) : undefined,
      quantity: product?.quantity,
      expirationHours: 9,
    },
  });

  useEffect(() => {
    if (product) {
      form.setValues({
        productId: product.id,
        title: product.title,
        description: product.description,
        originalPrice: Number(product.originalPrice),
        discountedPrice: Number(product.discountedPrice),
        quantity: product.quantity,
        expirationHours: 9,
      });
      setReuseInfo(true); // Reset to default state when a new product is selected
    }
  }, [product, form.setValues]);

  const handleSubmit = (values: z.infer<typeof repostSchema>) => {
    if (!product) return;

    const payload: z.infer<typeof repostSchema> = {
      productId: product.id,
      expirationHours: values.expirationHours,
    };

    if (!reuseInfo) {
      payload.title = values.title;
      payload.description = values.description;
      payload.originalPrice = values.originalPrice;
      payload.discountedPrice = values.discountedPrice;
      payload.quantity = values.quantity;
    } else {
      // Even if reusing, allow quantity override
      payload.quantity = values.quantity;
    }

    repostMutation.mutate(payload, {
      onSuccess: () => {
        onClose();
        if (product) {
          form.setValues({
            productId: product.id,
            title: product.title,
            description: product.description,
            originalPrice: Number(product.originalPrice),
            discountedPrice: Number(product.discountedPrice),
            quantity: product.quantity,
            expirationHours: 9,
          });
          setReuseInfo(true);
        }
      },
    });
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={styles.dialogContent}>
        <DialogHeader>
          <DialogTitle>Repost "{product.title}"</DialogTitle>
          <DialogDescription>
            Create a new listing based on this product. You can either reuse the existing details or provide new ones.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} id="repost-form">
            <div className={styles.checkboxContainer}>
              <Checkbox
                id="reuse-info"
                checked={reuseInfo}
                onChange={(e) => setReuseInfo(e.target.checked)}
              />
              <label htmlFor="reuse-info" className={styles.checkboxLabel}>
                Reuse photo & info as-is
              </label>
            </div>

            <div className={styles.formGrid}>
              <FormItem name="title">
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    disabled={reuseInfo || repostMutation.isPending}
                    value={form.values.title || ''}
                    onChange={(e) => form.setValues((p) => ({ ...p, title: e.target.value }))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>

              <FormItem name="description">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    disabled={reuseInfo || repostMutation.isPending}
                    value={form.values.description || ''}
                    onChange={(e) => form.setValues((p) => ({ ...p, description: e.target.value }))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>

              <div className={styles.priceGrid}>
                <FormItem name="originalPrice">
                  <FormLabel>Original Price (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      disabled={reuseInfo || repostMutation.isPending}
                      value={form.values.originalPrice || ''}
                      onChange={(e) => form.setValues((p) => ({ ...p, originalPrice: e.target.valueAsNumber }))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                <FormItem name="discountedPrice">
                  <FormLabel>Discounted Price (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      disabled={reuseInfo || repostMutation.isPending}
                      value={form.values.discountedPrice || ''}
                      onChange={(e) => form.setValues((p) => ({ ...p, discountedPrice: e.target.valueAsNumber }))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </div>

              <div className={styles.quantityGrid}>
                <FormItem name="quantity">
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      disabled={repostMutation.isPending}
                      value={form.values.quantity || ''}
                      onChange={(e) => form.setValues((p) => ({ ...p, quantity: e.target.valueAsNumber }))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                <FormItem name="expirationHours">
                  <FormLabel>Expires In (Hours)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      max="24"
                      disabled={repostMutation.isPending}
                      value={form.values.expirationHours || ''}
                      onChange={(e) => form.setValues((p) => ({ ...p, expirationHours: e.target.valueAsNumber }))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </div>
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={repostMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="repost-form" disabled={repostMutation.isPending}>
            {repostMutation.isPending ? 'Reposting...' : 'Repost Offer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};