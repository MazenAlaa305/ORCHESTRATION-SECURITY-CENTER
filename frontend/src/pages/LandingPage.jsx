import React, { useEffect } from 'react';
import LandingNavbar from '../components/landing/LandingNavbar';
import Hero from '../components/landing/Hero';
import TrustStrip from '../components/landing/TrustStrip';
import ProblemSection from '../components/landing/ProblemSection';
import FeaturesGrid from '../components/landing/FeaturesGrid';
import HowItWorks from '../components/landing/HowItWorks';
import DashboardPreview from '../components/landing/DashboardPreview';
import StatsBar from '../components/landing/StatsBar';
import UseCases from '../components/landing/UseCases';
import FAQAccordion from '../components/landing/FAQAccordion';
import FinalCTA from '../components/landing/FinalCTA';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
    useEffect(() => {
        const prev = document.title;
        document.title = 'found 404 — Security orchestration for SMEs';
        return () => { document.title = prev; };
    }, []);

    return (
        <div className="min-h-screen bg-cyber-bg text-white overflow-x-hidden">
            <a href="#main" className="skip-link">Skip to content</a>
            <LandingNavbar />
            <main id="main">
                <Hero />
                <TrustStrip />
                <ProblemSection />
                <FeaturesGrid />
                <HowItWorks />
                <DashboardPreview />
                <StatsBar />
                <UseCases />
                <FAQAccordion />
                <FinalCTA />
            </main>
            <LandingFooter />
        </div>
    );
}
