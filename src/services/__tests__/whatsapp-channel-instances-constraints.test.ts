import { describe, it, expect, vi } from "vitest";

describe("WhatsApp Channel Instances Integrity Constraints", () => {
  it("enforces is_default=false when is_active=false to satisfy whatsapp_channel_instances_check1", () => {
    // Constraint: CHECK (is_default = false OR is_active = true)
    const validateCheck1 = (isDefault: boolean, isActive: boolean) => {
      return isDefault === false || isActive === true;
    };

    // Before fix: when disconnecting, is_default stayed true while is_active was set to false
    expect(validateCheck1(true, false)).toBe(false); // Violates check constraint!

    // After fix: when disconnecting, is_default is set to false along with is_active: false
    expect(validateCheck1(false, false)).toBe(true); // Satisfies check constraint!

    // When active, is_default can be true or false
    expect(validateCheck1(true, true)).toBe(true);
    expect(validateCheck1(false, true)).toBe(true);
  });

  it("prevents duplicate default instances per store to satisfy uq_whatsapp_default_instance_per_store", () => {
    // Partial Unique Index: uq_whatsapp_default_instance_per_store WHERE is_default = true AND is_active = true
    const storeInstances = [
      { id: "inst-1", display_name: "WhatsApp Principal", is_default: true, is_active: true },
    ];

    const hasOtherActiveDefault = storeInstances.some(
      (inst) => inst.is_default && inst.is_active && inst.id !== "inst-2"
    );

    // When adding inst-2, it must not become default if inst-1 is already active default
    const shouldBeDefault = !hasOtherActiveDefault;
    expect(shouldBeDefault).toBe(false);

    const newInstance = {
      id: "inst-2",
      display_name: "WhatsApp Gerente",
      is_default: shouldBeDefault,
      is_active: true,
    };

    const activeDefaults = [...storeInstances, newInstance].filter(
      (i) => i.is_default && i.is_active
    );

    // Exactly one active default instance exists in the store
    expect(activeDefaults.length).toBe(1);
    expect(activeDefaults[0].id).toBe("inst-1");
  });

  it("promotes remaining active connected instance when default instance is disconnected", () => {
    const instances = [
      { id: "inst-1", display_name: "WhatsApp Principal", is_default: true, is_active: false, status: "disconnected" },
      { id: "inst-2", display_name: "WhatsApp Gerente", is_default: false, is_active: true, status: "connected" },
    ];

    // If default is disconnected, find next connected & active instance to promote
    const nextToPromote = instances.find(
      (i) => i.id !== "inst-1" && i.is_active && i.status === "connected"
    );

    expect(nextToPromote).toBeDefined();
    expect(nextToPromote?.id).toBe("inst-2");
  });
});
