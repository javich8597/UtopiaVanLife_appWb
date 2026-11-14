import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import LegalLayout from '@/components/legal/LegalLayout'
import { ShieldCheck } from 'lucide-react'

export async function generateMetadata() {
  return {
    title: 'Política de Privacidad y RGPD | Utopia Van Life',
    description: 'Información sobre el tratamiento de datos personales, plazos de conservación y cumplimiento del RGPD en Utopia Van Life Mallorca.',
  }
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main>
        <LegalLayout
          title="Política de Privacidad y RGPD"
          subtitle="Última actualización: Noviembre 2026"
          icon={<ShieldCheck size={28} />}
        >
          <section className="legal-section">
            <h2 className="legal-heading">1. Responsable del Tratamiento</h2>
            <p className="legal-text">
              Utopia Van Life S.L., con domicilio en Palma de Mallorca (Islas Baleares), es el responsable del tratamiento de los datos personales facilitados a través de esta plataforma web.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-heading">2. Finalidad del Tratamiento de Datos</h2>
            <p className="legal-text">
              Recopilamos y tratamos tus datos personales con las siguientes finalidades legítimas:
            </p>
            <ul className="legal-list">
              <li><strong>Gestión de reservas:</strong> Contratación, entrega y devolución de vehículos camper.</li>
              <li><strong>Verificación de requisitos:</strong> Comprobación del carnet de conducir y cumplimiento de las condiciones de la póliza de seguro.</li>
              <li><strong>Pasarela de pago segura:</strong> Procesamiento de pagos y retención o liberación de fianzas mediante entidades bancarias homologadas.</li>
              <li><strong>Asistencia y atención al cliente:</strong> Notificaciones sobre el estado de tu alquiler o soporte en carretera 24/7.</li>
              <li><strong>Registro de viajeros:</strong> Cumplimiento del registro documental y la comunicación de datos que nos obliga el Real Decreto 933/2021 como empresa de alquiler de vehículos.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2 className="legal-heading">3. Plazos de Conservación</h2>
            <p className="legal-text">
              No conservamos todos tus datos el mismo tiempo. Cada tipo de dato tiene su propio plazo, que depende de para qué lo necesitamos y de las obligaciones legales que nos afectan:
            </p>
            <ul className="legal-list">
              <li>
                <strong>Imágenes de tus documentos de identidad:</strong> las fotografías de tu DNI, NIE o pasaporte y de tu permiso de conducir se eliminan de nuestro almacenamiento de forma irreversible a los <strong>100 días desde la devolución del vehículo</strong>. Si tienes varias reservas, las fotografías guardadas en tu carpeta de cliente se eliminan cuando vencen los 100 días de la última de ellas, porque son las mismas imágenes para todas. Lo mismo se aplica a las fotografías del segundo conductor autorizado.
              </li>
              <li>
                <strong>Datos del registro de viajeros:</strong> los datos de identificación que estamos obligados a registrar y comunicar a las autoridades conforme al Real Decreto 933/2021 (nombre, documento de identidad, datos del permiso de conducir y datos de los acompañantes) se conservan <strong>3 años desde la devolución del vehículo</strong>, que es el plazo que fija el artículo 5.3 de esa norma, y después se suprimen de la reserva.
              </li>
              <li>
                <strong>Contrato de alquiler firmado y tu firma:</strong> son la prueba de la relación contractual, así que no podemos indicarte aquí un plazo cerrado. Te indicamos el criterio que aplicamos: los conservamos mientras puedan derivarse responsabilidades del contrato y durante los plazos de conservación mercantil, contable y fiscal que nos obligan como empresa, que son más largos que los 3 años anteriores. En el contrato figuran también el nombre y el documento del segundo conductor autorizado, si lo hubo.
              </li>
              <li>
                <strong>Facturación y justificantes de pago:</strong> se conservan durante los plazos de conservación contable, mercantil y fiscal que nos obligan, con independencia de que tu cuenta siga existiendo.
              </li>
              <li>
                <strong>Tu ficha de cliente y tu cuenta:</strong> los datos de tu perfil (nombre, documento de identidad, fecha de nacimiento, dirección, teléfono, y número y caducidad de tu permiso de conducir) <strong>se conservan mientras exista tu cuenta</strong>. No caducan por sí solos: tu cuenta se borra únicamente si tú nos lo pides, como se explica en el apartado siguiente.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2 className="legal-heading">4. Cómo Pedir el Borrado de tu Cuenta</h2>
            <p className="legal-text">
              Para pedir que borremos tu cuenta, escríbenos a{' '}
              <a href="mailto:hola@utopiavanlife.com" className="legal-link">hola@utopiavanlife.com</a>{' '}
              desde la dirección de correo de tu cuenta, o indicándonos cómo podemos identificarte. No necesitas motivar la solicitud.
            </p>
            <p className="legal-text">
              Atenderemos tu petición <strong>en el plazo máximo de un mes</strong> desde que la recibamos. Si tu solicitud es compleja, podemos prorrogar ese plazo dos meses más; en ese caso te lo comunicaremos dentro del primer mes y te explicaremos el motivo del retraso (artículo 12.3 del RGPD).
            </p>
            <p className="legal-text">
              Al borrar tu cuenta se eliminan tu ficha de cliente y las imágenes de tus documentos de identidad que todavía conservemos. <strong>Hay datos que no podemos borrar en ese momento</strong>, y preferimos que lo sepas antes de pedirlo:
            </p>
            <ul className="legal-list">
              <li><strong>El registro de viajeros de tus reservas que aún no hayan cumplido 3 años</strong> desde la devolución del vehículo: nos obliga a conservarlo el Real Decreto 933/2021 y no podemos adelantar ese plazo. Se suprime en cuanto los 3 años se cumplen.</li>
              <li><strong>La facturación y los justificantes de pago</strong> de tus reservas, durante los plazos contables, mercantiles y fiscales que nos obligan.</li>
              <li><strong>El contrato de alquiler firmado</strong>, con el criterio explicado en el apartado anterior.</li>
            </ul>
            <p className="legal-text">
              El propio RGPD prevé esta limitación cuando el tratamiento sigue siendo necesario para cumplir una obligación legal o para la defensa de reclamaciones (artículo 17.3, letras b y e). Mientras conservemos esos datos por ese motivo, no los usamos para ninguna otra finalidad: ni para contactar contigo, ni para enviarte comunicaciones comerciales, ni para ningún análisis.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-heading">5. Si te Han Autorizado como Segundo Conductor</h2>
            <p className="legal-text">
              Este apartado va dirigido a ti si el titular de una reserva te ha autorizado a conducir la camper. En ese caso, <strong>tus datos no nos los has dado tú</strong>: nos los facilita el titular, que es quien sube las fotografías de tu DNI y de tu permiso de conducir desde su área de cliente. Tú no tienes cuenta con nosotros y, salvo que el titular nos la haya facilitado, no disponemos de ninguna forma de contacto contigo. Por eso esta página es la vía por la que te damos la información que el RGPD exige en estos casos (artículo 14, apartados 1, 2 y 5.b).
            </p>
            <ul className="legal-list">
              <li><strong>Quién es el responsable:</strong> Utopia Van Life S.L., con los datos del apartado 1.</li>
              <li><strong>De dónde proceden tus datos:</strong> nos los facilita el titular de la reserva que te autoriza a conducir. Él es el responsable de haberte informado antes de enviárnoslos, y así se lo exigimos al subirlos.</li>
              <li><strong>Qué datos tratamos:</strong> tu nombre y apellidos, tu documento de identidad, el número y las fechas de tu permiso de conducir, tu fecha de nacimiento y las fotografías de ambos documentos.</li>
              <li><strong>Para qué:</strong> autorizarte como conductor en el contrato de alquiler, comprobar que cumples los requisitos de edad y antigüedad del permiso que exige la póliza del seguro, y cumplir el registro de viajeros del Real Decreto 933/2021.</li>
              <li><strong>Base jurídica:</strong> el cumplimiento de la obligación legal del Real Decreto 933/2021 y nuestro interés legítimo en comprobar que quien conduce el vehículo cumple las condiciones de la póliza (artículo 6.1, letras c y f, del RGPD).</li>
              <li><strong>Cuánto tiempo:</strong> las fotografías de tus documentos se eliminan a los 100 días de la devolución del vehículo y los datos del registro de viajeros a los 3 años, en los mismos términos del apartado 3. Tu nombre y tu documento figuran además en el contrato de alquiler firmado, que se conserva con el criterio explicado en ese mismo apartado.</li>
              <li><strong>Tus derechos:</strong> son los mismos que se describen en el apartado siguiente y puedes ejercerlos directamente ante nosotros, sin pasar por el titular de la reserva, escribiendo a{' '}
                <a href="mailto:hola@utopiavanlife.com" className="legal-link">hola@utopiavanlife.com</a>.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2 className="legal-heading">6. Tus Derechos</h2>
            <p className="legal-text">
              De conformidad con el Reglamento General de Protección de Datos (RGPD) y la LOPDGDD, puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición remitiendo tu solicitud a{' '}
              <a href="mailto:hola@utopiavanlife.com" className="legal-link">hola@utopiavanlife.com</a>. Responderemos a cualquiera de estas solicitudes en el plazo de un mes, prorrogable dos meses más en los términos del apartado 4.
            </p>
            <p className="legal-text">
              Si consideras que no hemos atendido correctamente tu solicitud, puedes presentar una reclamación ante la Agencia Española de Protección de Datos ({' '}
              <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="legal-link">www.aepd.es</a>
              {' '}), que es la autoridad de control competente en España.
            </p>
          </section>
        </LegalLayout>
      </main>
      <Footer />
    </>
  )
}
