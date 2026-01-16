"use client";

export default function PrivacyPolicyPage() {
    return (
        <div className="bg-background min-h-screen pt-32 pb-20">
            <div className="container mx-auto px-4 max-w-3xl">
                <h1 className="text-4xl font-serif font-bold text-primary mb-8">Privacy Policy</h1>
                <div className="prose prose-lg text-foreground/80">
                    <p className="text-sm text-foreground/50 mb-8">Last Updated: January 17, 2026</p>

                    <h3>1. Introduction</h3>
                    <p>JurisQuery ("we," "our," or "us") respects your privacy and is committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.</p>

                    <h3>2. Data We Collect</h3>
                    <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:</p>
                    <ul>
                        <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                        <li><strong>Contact Data:</strong> includes billing address, delivery address, email address and telephone numbers.</li>
                        <li><strong>Document Data:</strong> includes the legal documents you upload for analysis. We encrypt and store these strictly for the purpose of providing our service.</li>
                    </ul>

                    <h3>3. How We Use Your Data</h3>
                    <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                    <ul>
                        <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                        <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                    </ul>

                    <h3>4. Data Security</h3>
                    <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.</p>
                </div>
            </div>
        </div>
    );
}
