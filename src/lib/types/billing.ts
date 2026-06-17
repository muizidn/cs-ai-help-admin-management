import type { User } from "./transactions"
import type { Organization } from "./organization"

export interface BillingState {
  id: string
  ownerId: string
  ownerType: "user" | "organization"
  creditBalance: number
  subscriptionCredit: number
  payAsYouGoCredit: number
  rolloverCredit: number
  topupBalance: number
  planId: string
  subscriptionStatus: "active" | "expired" | "pending" | "canceled"
  currentPeriodStart?: Date | string
  currentPeriodEnd?: Date | string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface BillingEntity {
  id: string
  name: string
  email?: string
  type: "user" | "organization"
  billingState?: BillingState
}

export interface BillingQuery {
  page?: number
  limit?: number
  search?: string
  type?: "user" | "organization"
  subscriptionStatus?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
}
export interface BillingStateUpdateInput {
  subscriptionCredit?: number
  payAsYouGoCredit?: number
  rolloverCredit?: number
  topupBalance?: number
  subscriptionStatus?: "active" | "expired" | "pending" | "canceled"
  currentPeriodEnd?: Date | string
}
