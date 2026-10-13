"use client";
import { ActionForm } from "./ActionForm";
import { Field } from "./ui";
import { saveAddress } from "@/lib/actions/org";

export function AddressForm() {
  return (
    <ActionForm action={saveAddress} submitLabel="Save address" submitVariant="secondary" resetOnSuccess>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Label" htmlFor="a-label"><input id="a-label" name="label" placeholder="Athletic office" /></Field>
        <Field label="Attention" htmlFor="a-att"><input id="a-att" name="attention" placeholder="Coach Smith" /></Field>
        <Field label="Street" htmlFor="a-l1"><input id="a-l1" name="line1" required /></Field>
        <Field label="Suite / building" htmlFor="a-l2"><input id="a-l2" name="line2" /></Field>
        <Field label="City" htmlFor="a-city"><input id="a-city" name="city" required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="State" htmlFor="a-st"><input id="a-st" name="state" maxLength={2} placeholder="OH" required /></Field>
          <Field label="ZIP" htmlFor="a-zip"><input id="a-zip" name="postalCode" required /></Field>
        </div>
        <Field label="Phone (for the carrier)" htmlFor="a-ph"><input id="a-ph" name="phone" type="tel" /></Field>
      </div>
    </ActionForm>
  );
}
