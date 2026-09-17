/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * --- PRINCIPIO NO NEGOCIABLE: LÍMITES CLÍNICOS ---
 * Esta app NO diagnostica, no clasifica trastornos, ni infiere "enfermedades" o cuadros clínicos.
 * El cuestionario inicial es para perfilamiento motivacional/personalidad (OCEAN), NUNCA diagnóstico.
 * ---
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface Question {
  id: number;
  text: string;
  options: { label: string; value: string }[];
}

const questions: Question[] = [
  {
    id: 1,
    text: "¿Cómo sueles reaccionar ante los retos?",
    options: [
      { label: "Me gustan los pasos pequeños y claros", value: "small_steps" },
      { label: "Prefiero ver el panorama general y lanzarme", value: "big_picture" },
    ],
  },
  {
    id: 2,
    text: "¿Qué te motiva más al completar una tarea?",
    options: [
      { label: "Un refuerzo visual inmediato", value: "visual_reinforcement" },
      { label: "Saber que ayuda a mi meta a largo plazo", value: "long_term_goal" },
    ],
  },
  {
    id: 3,
    text: "¿Cuál es tu nivel de energía típico durante el día?",
    options: [
      { label: "Mañanero", value: "morning" },
      { label: "Vespertino", value: "afternoon" },
      { label: "Nocturno", value: "night" },
    ],
  },
  {
    id: 4,
    text: "¿Cómo te sientes mejor siendo supervisado?",
    options: [
      { label: "Con recordatorios constantes y gentiles", value: "constant_reminders" },
      { label: "Con autonomía total y reportes semanales", value: "autonomy" },
    ],
  },
  {
    id: 5,
    text: "¿Cuál es tu principal propósito al usar 'Ruta'?",
    options: [
      { label: "Construir hábitos nuevos", value: "build_habits" },
      { label: "Lograr una meta grande", value: "achieve_big_goal" },
      { label: "Organizar mi vida", value: "organize_life" },
    ],
  },
];

interface QuestionnaireProps {
  onComplete: (answers: Record<number, string>) => void;
}

export default function Questionnaire({ onComplete }: QuestionnaireProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const handleOptionSelect = (value: string) => {
    setAnswers(prev => ({ ...prev, [questions[currentIdx].id]: value }));
    
    if (currentIdx < questions.length - 1) {
      setTimeout(() => setCurrentIdx(prev => prev + 1), 300);
    } else {
      onComplete({ ...answers, [questions[currentIdx].id]: value });
    }
  };

  const question = questions[currentIdx];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-neutral-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-sm text-neutral-500 font-medium tracking-wide">
          Pregunta {currentIdx + 1} de {questions.length}
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-2xl font-light text-neutral-800 mb-8 leading-tight">
              {question.text}
            </h2>
            
            <div className="space-y-4">
              {question.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect(option.value)}
                  className={`w-full p-6 text-left rounded-xl border transition-all duration-200 ${
                    answers[question.id] === option.value
                      ? 'bg-neutral-800 text-white border-neutral-800'
                      : 'bg-white border-neutral-200 hover:border-neutral-400 text-neutral-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-12">
          <button
            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="flex items-center text-neutral-400 disabled:opacity-0 transition-opacity"
          >
            <ChevronLeft size={20} className="mr-1" /> Anterior
          </button>
        </div>
      </div>
    </div>
  );
}
