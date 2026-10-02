import React from "react";
import { ClassifiedBookingDialog } from "./classified-booking-dialog";
import { ClassifiedProposalDialog } from "./classified-proposal-dialog";
import { ClassifiedCompanionDialog } from "./classified-companion-dialog";
import { ClassifiedJobApplicationDialog } from "./classified-job-application-dialog";

export interface ClassifiedDetailDialogsProps {
  classified: any;
  detail: any;
  viewerContext: string;
  currentProfile?: any;
}

export function ClassifiedDetailDialogs({
  classified,
  detail,
  viewerContext,
  currentProfile,
}: ClassifiedDetailDialogsProps) {
  return (
    <>
      <ClassifiedBookingDialog
        classified={classified}
        open={detail.bookingOpen}
        onOpenChange={detail.setBookingOpen}
        viewerContext={viewerContext}
        isTravelPackage={detail.isTravelPackage}
        departureOptions={detail.departureOptions}
        boardingGateways={detail.boardingGateways}
        flightDetails={detail.flightDetails}
        selectedDeparture={detail.selectedDeparture}
        setSelectedDeparture={detail.setSelectedDeparture}
        selectedBoardingPoint={detail.selectedBoardingPoint}
        setSelectedBoardingPoint={detail.setSelectedBoardingPoint}
        travelPassengers={detail.travelPassengers}
        setTravelPassengers={detail.setTravelPassengers}
        effectiveTravelUnitPriceCents={detail.effectiveTravelUnitPriceCents}
        isPerPerson={detail.isPerPerson}
        travelTotalCents={detail.travelTotalCents}
        maxInstallments={detail.maxInstallments}
        travelInstallmentCents={detail.travelInstallmentCents}
        handleDirectBooking={detail.handleDirectBooking}
        isBooking={detail.isBooking}
        checkInDate={detail.checkInDate}
        setCheckInDate={detail.setCheckInDate}
        checkOutDate={detail.checkOutDate}
        setCheckOutDate={detail.setCheckOutDate}
        bookingGuests={detail.bookingGuests}
        setBookingGuests={detail.setBookingGuests}
        bookedDates={detail.bookedDates}
        isDateRangeOverlapping={detail.isDateRangeOverlapping}
        dailyRateCents={detail.dailyRateCents}
        nightsCount={detail.nightsCount}
        cleaningFeeCents={detail.cleaningFeeCents}
        bookingTotalCents={detail.bookingTotalCents}
      />
      <ClassifiedProposalDialog
        classified={classified}
        open={detail.proposalOpen}
        onOpenChange={detail.setProposalOpen}
        viewerContext={viewerContext}
        proposalPriceCents={detail.proposalPriceCents}
        setProposalPriceCents={detail.setProposalPriceCents}
        proposalPaymentMethod={detail.proposalPaymentMethod}
        setProposalPaymentMethod={detail.setProposalPaymentMethod}
        proposalInstallments={detail.proposalInstallments}
        setProposalInstallments={detail.setProposalInstallments}
        proposalDepositCents={detail.proposalDepositCents}
        setProposalDepositCents={detail.setProposalDepositCents}
        proposalTerms={detail.proposalTerms}
        setProposalTerms={detail.setProposalTerms}
        customAnswers={detail.customAnswers}
        setCustomAnswers={detail.setCustomAnswers}
        isSendingProposal={detail.isSendingProposal}
        handleSendProposal={detail.handleSendProposal}
      />
      <ClassifiedCompanionDialog
        classified={classified}
        open={detail.companionModalOpen}
        onOpenChange={detail.setCompanionModalOpen}
      />
      <ClassifiedJobApplicationDialog
        classified={classified}
        currentProfile={currentProfile}
        viewerContext={viewerContext}
        open={detail.applyModalOpen}
        onOpenChange={detail.setApplyModalOpen}
      />
    </>
  );
}
