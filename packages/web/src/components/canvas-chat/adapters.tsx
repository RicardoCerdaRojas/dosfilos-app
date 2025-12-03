import { ExegeticalStudy, HomileticalAnalysis, SermonContent } from '@dosfilos/domain';
import { ContentAdapter, QuickAction } from '@dosfilos/domain';

export class ExegesisAdapter implements ContentAdapter<ExegeticalStudy> {
  render(content: ExegeticalStudy) {
    // This will be implemented in the ContentCanvas component
    return null;
  }

  serialize(content: ExegeticalStudy): string {
    return JSON.stringify(content);
  }

  deserialize(data: string): ExegeticalStudy {
    return JSON.parse(data);
  }

  getQuickActions(selection?: string): QuickAction[] {
    return [
      {
        id: 'deepen-context',
        label: 'Profundizar contexto',
        description: 'Agregar más detalles sobre el contexto histórico y cultural'
      },
      {
        id: 'add-references',
        label: 'Agregar referencias',
        description: 'Incluir referencias cruzadas y pasajes relacionados'
      },
      {
        id: 'clarify-meaning',
        label: 'Clarificar significado',
        description: 'Explicar mejor el significado del texto'
      },
      {
        id: 'expand-application',
        label: 'Expandir aplicación',
        description: 'Desarrollar más la aplicación práctica'
      }
    ];
  }
}

export class HomileticsAdapter implements ContentAdapter<HomileticalAnalysis> {
  render(content: HomileticalAnalysis) {
    return null;
  }

  serialize(content: HomileticalAnalysis): string {
    return JSON.stringify(content);
  }

  deserialize(data: string): HomileticalAnalysis {
    return JSON.parse(data);
  }

  getQuickActions(selection?: string): QuickAction[] {
    return [
      {
        id: 'refine-proposition',
        label: 'Refinar proposición',
        description: 'Mejorar la claridad y fuerza de la proposición homilética'
      },
      {
        id: 'improve-structure',
        label: 'Mejorar estructura',
        description: 'Optimizar la organización del bosquejo'
      },
      {
        id: 'add-point',
        label: 'Agregar punto',
        description: 'Sugerir un punto adicional para el sermón'
      },
      {
        id: 'strengthen-transitions',
        label: 'Fortalecer transiciones',
        description: 'Mejorar las conexiones entre puntos'
      }
    ];
  }
}

export class SermonAdapter implements ContentAdapter<SermonContent> {
  render(content: SermonContent) {
    return null;
  }

  serialize(content: SermonContent): string {
    return JSON.stringify(content);
  }

  deserialize(data: string): SermonContent {
    return JSON.parse(data);
  }

  getQuickActions(selection?: string): QuickAction[] {
    return [
      {
        id: 'expand-point',
        label: 'Expandir punto',
        description: 'Desarrollar más este punto del sermón'
      },
      {
        id: 'add-illustration',
        label: 'Agregar ilustración',
        description: 'Incluir una ilustración relevante'
      },
      {
        id: 'improve-transition',
        label: 'Mejorar transición',
        description: 'Suavizar la transición entre secciones'
      },
      {
        id: 'shorten-section',
        label: 'Acortar sección',
        description: 'Hacer esta sección más concisa'
      },
      {
        id: 'strengthen-application',
        label: 'Fortalecer aplicación',
        description: 'Hacer la aplicación más práctica y específica'
      }
    ];
  }
}
