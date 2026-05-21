# **`📱`** **LINKER (Secure Chat Edition)**

### Complete Technical Blueprint & Architectural Specification

Linker is an exclusive, _**1:1**_ zero-knowledge encrypted messaging mobile application built entirely on a single
stack cloud architecture using **React Native (Expo)** and **Supabase** . It is designed to connect exactly two

individuals—whether couples, partners, or best friends—while completely discarding the traditional multi
contact friend list model.

## **1. System Vision & Core Philosophy**


Linker completely eliminates public profiles, global user discovery feeds, and complex navigation dashboards

to focus strictly on maintaining a highly optimized, ultra-private communication sanctuary between two

connected nodes.

```
 [User A] <======== (End-to-End Encrypted 1:1 Link) =======> [User B]

```

  - **The Zero-Contact Graph:** There are no contact synchronizations, user directory listings, discoverability

matching metrics, or public friend request searches. The application acts as a completely closed social

graph.


  - **The Twin Lock (** _**1:1**_ **):** Device account profiles exist permanently in either an _Unlinked_ or _Linked_

relationship state. Upon initial registration, the user is presented with a minimal, blank slate interface

containing a prompt to input their single partner's number. Once User A initiates the pairing request and

User B accepts, both account records enter an immutable, locked state within the relational database

layer. From that millisecond forward, neither account can request or accept connection parameters from

any other user ID in the system.


  - **Direct-to-Chat Routing:** Linker contains no main menus, home dashboards, or conversation history lists.

If an authenticated user is successfully linked, launching the application completely clears all onboarding

wrappers and transitions **directly into the full-screen chat timeline with their partner** . The interface

behaves as a persistent, dedicated visual portal between the two devices.

## **2. Security & Cryptographic Architecture (E2EE)**


To guarantee absolute conversational privacy, Linker operates a zero-knowledge, client-side cryptographic

encryption framework. The underlying cloud architecture acts purely as an opaque, blind storage medium for

unreadable ciphertext strings, guaranteeing that no third party can read the content data logs.


1


```
[Your Device] ───(1. Encrypts Text to Ciphertext via AES-GCM-256)───> [Supabase DB] │
[Partner Device] <──(2. Receives Ciphertext via WebSockets & Decrypts Locally)───┘

```

- **Key Generation & Pairing Handshake:** When an unlinked device user interfaces with the pairing panel

and dispatches a connection request, a unique 256-bit symmetric cryptographic key is generated locally

on the phone hardware using cryptographically secure random number generation ( `expo-crypto` ).

During the initial setup handshake, this key is securely negotiated and passed directly to the partner's

terminal before being immediately erased from the server layer completely.


- **Hardware Enclave Caching:** The verified symmetric key is stored locally inside each device's isolated

hardware secure storage partition using `expo-secure-store` . The key never touches the cloud network

environment again, establishing a zero-knowledge boundary.


- **The AES-GCM-256 Pipeline:**









**Outbound Processing:** Cleartext user strings and media source links are instantly encrypted locally

using the local hardware key before network transmission payloads are constructed.


**Inbound Processing:** The partner terminal receives the real-time encrypted records via active

WebSockets and executes local decryption routines instantly inside volatile client memory right before

rendering elements on screen.


## **3. Authentication Lifecycle (Free Zero-SMS Gateway)**

To avoid reliance on paid third-party cellular SMS text gateways (such as Twilio), Linker utilizes an engineered

**WhatsApp-Style Secure Access PIN** protocol natively managed through Supabase.

```
 [New Sign Up] ──> Enter Phone Number ──> Create Private 6-Digit PIN ──> Logged In
 [Returning] ──> Enter Phone Number ──> Enter Saved 6-Digit PIN ──> Session Restored

```

  - **Security Guardrail:** During the initial profile enrollment, the client registers their unique mobile phone

identifier string and establishes a secret 6-digit access PIN. This credential is fully hashed using a secure

one-way cryptographic hashing algorithm prior to hitting the cloud database.


  - **Device Hijack Protection:** For future login restoration cycles or multi-device deployment activations, the

user supplies their registered phone identifier alongside their secret PIN. Because your relational

ecosystem is restricted strictly to two users, this approach keeps authentication completely free, secure,

and independent of external messaging systems.


  - **Persistent Sessions:** Once a login is validated against the database hash, the active session token is

locked within the device's hardware enclave, allowing the application to maintain login context indefinitely

across device reboots until an explicit sign-out command is issued.


2


## **4. UI/UX Blueprint & Visual Branding Assets**

Linker completely avoids default cross-platform component packages to preserve a premium visual footprint

matching strict iOS design rules.


**4.1 Core Brand Typography & Iconography**


  - **The Launcher Icon:** The application enforces a premium skeuomorphic gloss chat bubble emblem. A

deep sky-blue base gradient combined with a soft-lit, light gray inner text well creates a distinctive, modern

home screen asset.


  - **Typography Scaling:** Text elements map precisely to Apple's native _San Francisco (SF Pro Display &_

_Text)_ font layout rules, enforcing standard iOS point-weightings, explicit line heights, and proper letter
spacing tracking.


  - **Universal Apple Emojis:** To prevent rendering fragmentation across mixed Android and iOS

deployments, Linker embeds custom asset translation rules to guarantee all text feeds, chat headers, and

input fields render crisp, high-resolution _Apple Emojis_ natively across all targeted consumer hardware

targets.


**4.2 Layout Tokens & The Chat Bubble Rule**


  - **Translucent Filters:** Top title bars, overlay containers, and slide-out setting sheets use semi-translucent

glassmorphic backgrounds. It applies an alpha-channel mask layer to blur underlying messages softly as

they scroll out of view.


  - **Sender (You):** Classic Apple Royal Blue ( `#007AFF` ), white text alignments, right-justified bubble paths

with a sharp trailing corner anchor.


  - **Recipient (Partner):** Soft Light Gray ( `#E9E9EB` ), dark charcoal text typography, left-justified bubble paths

with a rounded leading edge. Minimalist delivery status text ("Delivered", "Read") and dynamic timestamps

pop up directly underneath text boundaries.

## **5. Feature & Subsystem Breakdown**


**5.1 Direct-Redirect Routing Engine**


The root router component operates on a strict sequential state-machine that automatically organizes screen

rendering parameters instantly upon initialization:


1. **Unauthenticated:** Displays the minimal iOS-styled Phone + Access PIN authentication dashboard layout.


2. **Authenticated + Unlinked:** Renders a clean, blank slate container interface featuring a single, centered

**"Link Partner"** button. Tapping it invokes a secure text entry modal asking for the partner's international

mobile format.


3. **Authenticated + Linked:** Completely bypasses onboarding elements, automatically establishing

persistent real-time streams and loading the live full-screen chat pipeline screen.


3


**5.2 Zero-Footprint Multimedia Engine**


To conserve mobile device memory allocations and ensure extreme information confidentiality, asset

attachments never write blocks into your telephone's native local gallery or camera roll apps.


  - **The Upload Chain:** When taking or selecting images, video files, voice notes, moving GIFs, or custom

stickers, the asset is temporarily compiled as an in-memory byte array stream, piped straight to a secure

cloud storage bucket, and immediately flushed from local workspace paths.


  - **The On-Demand Stream:** Outbound attachments pass the generated storage URL through the client

encryption engine before database registration. The receiving user decrypts the secure stream path on
the-fly, pulling blocks via audio-visual streaming handlers which load elements into volatile memory space

exclusively during active user viewing sessions. Closing the app wipes the memory buffer clean.


**5.3 Free Peer-to-Peer Voice & Video Calling**


Linker houses a high-performance audio/video networking setup utilizing a pure decentralized **Peer-to-Peer**

**(P2P) WebRTC Mesh** framework.


  - **Signaling Channels:** Rather than utilizing expensive centralized infrastructure media processing servers,

the system harnesses low-latency **Realtime WebSockets** channels to negotiate link configurations (SDP

Offers, Answers, and ICE Candidates) as tiny text payloads.


  - **Direct Stream Routing:** Following handshake clearance, live audio and video signals stream directly

between both active phone terminals using free, public STUN parameters. Because data bypasses

intermediate cloud servers, calling remains completely free, low-latency, private, and unthrottled.


**5.4 Granular Space Customization**


Swiping from the left terminal screen boundary draws out a minimal iOS slide-out Settings panel. Structural

edits modify the shared configuration preferences, re-rendering your partner's client viewport instantly over

active WebSockets channels:


 - Custom text nickname bindings that seamlessly overwrite raw system data display profiles in message

headers.


 - Dynamic color theme matrices adjusting individual hex-coded conversation bubble backgrounds and

switching light/dark interface modes.


 - Custom abstract background graphics or personal portrait photos loaded as the scrolling canvas chat

wallpaper.

## **6. Dashboard Infrastructure Configurations**


To ensure client read/write routines evaluate smoothly inside your backend setup, finalize the following

toggles in your cloud storage manager:


4


**6.1 Storage Bucket Base Layer**


  - **Bucket Identifier Target:** Must read exactly `our-space-media` .


  - **Public Toggle Enforcement:** In your bucket configuration panel, ensure **Public bucket** is toggled to **ON**

**(Enabled)** . Since our architecture relies on client-side asset streaming via direct public URLs, the bucket

must allow unauthenticated read requests. (Security is not compromised because the asset URLs

themselves are fully client-side encrypted before hitting the database).




  - **Optimization Guardrails:** Turn on both _Restrict file size_ (cap it at 50 MB to prevent massive media files

from exhausting your storage limits) and _Restrict MIME types_ to whitelist images, short videos, and audio

voice files.


**6.2 Row Level Security (RLS) Policy Assignment**


To allow your mobile client application to stream and upload attachments smoothly without permission errors,

verify your target policy values match these parameters exactly:





5


