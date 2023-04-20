const { createBot, createProvider, createFlow, addKeyword, addAnswer } = require('@bot-whatsapp/bot')
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const axios = require('axios');

///////////////////////// API PLANES /////////////////////////

const menuIDPLANES = async () => {
  const config = {
    method: 'get',
    url: `https://www.cloud.wispro.co/api/v1/plans`,
    headers: {
      'Authorization': '9ee38f36-a5f2-4e2f-8ed7-d902a82415e5', 
      'accept': 'application/json'
    }
  };

  try {
    const { data } = await axios(config);
    return data.data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

///////////////////////// API CONTRATOS ///////////////////////



const menuAPICONTRATO = async (numero_documento) => {
  const parsedNumeroDocumento = parseFloat(numero_documento.replace(/[\.,]/g, ''));
  const planes = await menuIDPLANES();
  const config = {
    method: 'get',
    url: `https://www.cloud.wispro.co/api/v1/contracts?client_national_identification_number_eq=${parsedNumeroDocumento}`,
    headers: {
      'Authorization': '9ee38f36-a5f2-4e2f-8ed7-d902a82415e5',
      'accept': 'application/json'
    }
  };
  try {
    const { data } = await axios(config);
    let contracts = [];
    if (Array.isArray(data.data)) {
      contracts = data.data;
    } else if (typeof data.data === 'object') {
      contracts.push(data.data);
    }
    let total_records = contracts.length;
    if (data.meta && data.meta.pagination && data.meta.pagination.total_records) {
      total_records = data.meta.pagination.total_records;
    }
    if (total_records === 0) {
      return "No se encontraron contratos asociados a este documento";
    }
    if (total_records === 1) {
      const { plan_id, state } = contracts[0];
      const plan = planes.find(p => p.id === plan_id);
      const plan_name = plan ? plan.name : 'No disponible';
      return `Se ha encontrado 1 contrato asociado a este documento. El plan asociado es: ${plan_name}. Estado: ${state}`;
    }
    const plan_counts = {};
    contracts.forEach(c => {
      if (c.plan_id) {
        if (!plan_counts[c.plan_id]) {
          plan_counts[c.plan_id] = 1;
        } else {
          plan_counts[c.plan_id]++;
        }
      }
    });
    const contract_counts = Object.keys(plan_counts).map(k => `${plan_counts[k]} plan(s) ${planes.find(p => p.id === k).name}`);
    const state_counts = contracts.reduce((acc, c) => {
      if (c.state) {
        if (!acc[c.state]) {
          acc[c.state] = 1;
        } else {
          acc[c.state]++;
        }
      }
      return acc;
    }, {});
    const state_counts_str = Object.keys(state_counts).map(k => `${state_counts[k]} contrato(s) ${k}`).join(', ');
    return `Se han encontrado ${total_records} contratos asociados a este documento. Planes: ${contract_counts.join(', ')}. Estados: ${state_counts_str}`;
  } catch (error) {
    console.error(error);
    return "Ocurrió un error al realizar la búsqueda. Por favor, inténtalo de nuevo más tarde.";
  }
};



///////////////////////// API USUARIOS ///////////////////////


const menuAPI = async (numero_documento) => {
  const formatted_numero_documento = numero_documento.replace(/\./g, '');
  const parsed_numero_documento = parseFloat(formatted_numero_documento.replace(/,/g, '.'));
  const config = {
    method: 'get',
    url: `https://www.cloud.wispro.co/api/v1/clients?national_identification_number_eq=${parsed_numero_documento}`,
    headers: {
      'Authorization': '9ee38f36-a5f2-4e2f-8ed7-d902a82415e5', 
      'accept': 'application/json'
    }
  };

  try {
    const { data } = await axios(config);
    const client = data.data[0];

    if (!client) {
      const formatted_numero_documento_con_puntos = parsed_numero_documento.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      const config_con_puntos = {
        method: 'get',
        url: `https://www.cloud.wispro.co/api/v1/clients?national_identification_number_eq=${formatted_numero_documento_con_puntos}`,
        headers: {
          'Authorization': '9ee38f36-a5f2-4e2f-8ed7-d902a82415e5',
          'accept': 'application/json'
        }
      };
      const { data: data_con_puntos } = await axios(config_con_puntos);

      if (data_con_puntos.data.length === 0) {
        return [{ body: '*Cliente:* No se encontró ningún cliente con el número de identificación proporcionado.' }];
      }

      const {
        name,
        address,
        id,
        public_id,
        custom_id,
        email,
        password,
        phone,
        phone_mobile,
        phone_mobile_verified,
        national_identification_number,
        city,
        state,
        details,
        collector_id,
        seller_id,
        neighborhood_id,
        created_at,
        updated_at,
        link_mobile_login
      } = data_con_puntos.data[0];

      return [
        { body: `Tituar: *${name}:*\nDirección: ${address}\nEmail: ${email}\nNo. de documento: ${national_identification_number}\nCiudad: ${city}\nEstado: ${state}`
      },
      ];
    }

    const {
      name,
      address,
      id,
      custom_id,
      email,
      password,
      phone,
      phone_mobile,
      phone_mobile_verified,
      national_identification_number,
      city,
      state,
      details,
      collector_id,
      seller_id,
      neighborhood_id,
      created_at,
      updated_at,
      link_mobile_login
    } = client;

    return [
      { body: `Tituar: *${name}:*\nDirección: ${address}\nID: ${id}\nEmail: ${email}\nNo. de documento: ${national_identification_number}\nCiudad: ${city}\nEstado: ${state}\nCreado en: ${created_at}\nActualziado en: ${updated_at}`
    }];
  } catch (error) {  }
};


///////////////////////// FLUJO CONVERSACIÓN //////////////////////


const flowUsuarioNuevo = 
addKeyword(['0'])
.addAnswer(['Para contratar nuestro servicio de internet previamente se hará estudio crediticio en centrales de riesgos (no tiene costo y sin compromiso alguno)\n',
'🧾 REQUISITOS PARA EL ESTUDIO CREDITICIO:\n',
'Estos documentos puede enviarlos con foto tomada desde el celular siempre y cuando se vea enfocada la imagen y sean legibles los textos\n',

'1️⃣ Foto de cédula ambas caras ( o cualquier documento extranjero )\n',


'2️⃣ Recibo de servicios Públicos ( únicamente para validación de dirección y estrato del predio \n',


'3️⃣ Aceptar y firmar el documento de Autorización de tratamiento de datos personales, ( Para permitirnos realizar el estudio crediticio) (Adjunto documento PDF al final del chat)\n',

'👉🏼 COSTOS DE INSTALACIÓN:\n',

'-Material Instalado $ 90.000 (Se deben cancelar el día de la instalación)',

'-Router TP-Link dos antenas* $ 90.000 (Se debe cancelar el día de la instalación)*\n',

'=TOTAL A CANCELAR $ 180.000',

'*Este router quedará de su propiedad, pero si usted ya tiene un router por favor enviar referencia del modelo para ver si es compatible y no se le cobrará.\n',

'🏷La primer factura del plan del servicio que contrate la puede cancelar a más tardar el día 30 del mes de la instalación.\n',

'Por favor tenga en cuenta que nuestro servicio cuenta con contrato por un año, (ya que nosotros cubrimos el costo del cambio de la antena en caso de que esta se llegue a dañar.'])
.addAnswer(['Planes y Tarifas'], { media: 'https://live.staticflickr.com/65535/52766118292_b4a97a4968_k.jpg' })
.addAnswer(['Autorización Tratamineto de datos'], { media: 'https://drive.google.com/uc?export=view&id=1szf0mj3Y3wmQ0qLudxGBqG2Rd4iKWBP5&rl' })





const flowSoportetecnico = 
addKeyword(['2'])
.addAnswer([
  '🟢 *0*. No tengo Internet en ningúno de mis disposiivos.',
  '🟢 *1*. No tengo Internet en solo uno de mis dispositivos.',
  '🟢 *2*. Mi internet está lento o intermitente'])


  const flowConsultadecontrato = 
  addKeyword(['0'])
    .addAnswer('Digita el número de documento del Titular de la cuenta:', { capture: true }, (ctx) => {
    console.log('No de Documento consultado: ', ctx.body);
    ctx.flow = ctx.flow || {}; // Verifica que ctx.flow exista
    ctx.flow.numero_documento = ctx.body; return ctx.body;
    })
    .addAnswer('Verificando ✅',null, async (ctx, { flowDynamic }) => {
    const numero_documento = ctx.flow?.numero_documento;
    console.log('Número de documento capturado: ', numero_documento);
     if (numero_documento) {
       const data = await Promise.all([menuAPICONTRATO(numero_documento), menuAPI(numero_documento)]);
       const message1 = data[0][0].body;
       const message = data[1][0].body;
      const totalContratos = data[0][0].total_contratos;
      const totalContratosMessage = `Total de contratos encontrados:`;
  flowDynamic([{ body: `\n${totalContratosMessage} ${totalContratos}\n\n${message1}\n${message}\n`, total_contratos: totalContratos }])

     } else{
       console.log('No se capturó un número de documento válido.');
     }
  })


  const flowUsuarioantiguo = 
  addKeyword(['1'])
  .addAnswer([
  '🟢 *0*. Consultar el estado de mi contrato de internet.',
  '🟢 *1*. Solicitar un traspaso de titular de la cuenta',
  '🟢 *2*. Solicitar un cambio de plan de internet'],
  null, null, [flowConsultadecontrato])



const flowINICIO = addKeyword(['.consulta1!']).addAnswer(['*📡 ¡Hola! Te damos la bienvenida a Radionet Soluciones* 👋\n\nPara darte una atención mas personalizada, elige una de las siguientes opciones, Solo debes escribir el número de la opción que deseas consultar :\n',
'🟢 *0*. Deseo consultar información de los planes de internet, costos, requisitos y zonas de cobertura.',
'🟢 *1*. Ya soy cliente y deseo hacer una solicitud o realizar un trámite administrativo.',
'🟢 *2*. Ya soy cliente y necesito soporte técnico para mi servicio de internet.'],
null,null, [flowUsuarioNuevo, flowUsuarioantiguo, flowSoportetecnico, flowConsultadecontrato])
 



const main = async () => {
  const adapterDB = new MockAdapter()
  const adapterFlow = createFlow([flowINICIO])
  const adapterProvider = createProvider(BaileysProvider)

  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })

  QRPortalWeb()
}


main();