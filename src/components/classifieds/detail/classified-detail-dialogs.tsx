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
        onSelectDeparture={detail.setSelectedDeparture}
        selectedBoardingPoint={detail.selectedBoardingPoint}
        onSelectBoardingPoint={detail.setSelectedBoardingPoint}
        travelPassengers={detail.travelPassengers}
        onTravelPassengersChange={detail.setTravelPassengers}
        effectiveTravelUnitPriceCents={detail.effectiveTravelUnitPriceCents}
        isPerPerson={detail.isPerPerson}
        travelTotalCents={detail.travelTotalCents}
        maxInstallments={detail.maxInstallments}
        travelInstallmentCents={detail.travelInstallmentCents}
        onDirectBooking={detail.handleDirectBooking}
        isBooking={detail.isBooking}
        checkInDate={detail.checkInDate}
        onCheckInDateChange={detail.setCheckInDate}
        checkOutDate={detail.checkOutDate}
        onCheckOutDateChange={detail.setCheckOutDate}
        bookingGuests={detail.bookingGuests}
        onBookingGuestsChange={detail.setBookingGuests}
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
        onProposalPriceChange={detail.setProposalPriceCents}
        proposalPaymentMethod={detail.proposalPaymentMethod}
        onProposalPaymentMethodChange={detail.setProposalPaymentMethod}
        proposalInstallments={detail.proposalInstallments}
        onProposalInstallmentsChange={detail.setProposalInstallments}
        proposalDepositCents={detail.proposalDepositCents}
        onProposalDepositChange={detail.setProposalDepositCents}
        proposalTerms={detail.proposalTerms}
        onProposalTermsChange={detail.setProposalTerms}
        customAnswers={detail.customAnswers}
        onCustomAnswersChange={detail.setCustomAnswers}
        isSendingProposal={detail.isSendingProposal}
        onSendProposal={detail.handleSendProposal}
      />
      <ClassifiedCompanionDialog
        classified={classified}
        open={detail.companionModalOpen}
        onOpenChange={detail.setCompanionModalOpen}
      />
      <ClassifiedJobApplicationDialog
        classified={classified}
        currentProfile={currentProfile}
        open={detail.applyModalOpen}
        onOpenChange={detail.setApplyModalOpen}
      />
    </>
  );
}
