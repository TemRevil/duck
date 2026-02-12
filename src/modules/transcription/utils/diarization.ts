
export function cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let mA = 0;
    let mB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        mA += a[i] * a[i];
        mB += b[i] * b[i];
    }
    mA = Math.sqrt(mA);
    mB = Math.sqrt(mB);
    return dotProduct / (mA * mB);
}

export function clusterSegments(segments: any[], threshold = 0.7) {
    const speakers: number[][] = [];
    const results = segments.map(segment => {
        if (!segment.embedding) return { ...segment, speaker: 'Unknown' };

        let bestSpeaker = -1;
        let maxSimilarity = -1;

        for (let i = 0; i < speakers.length; i++) {
            const similarity = cosineSimilarity(segment.embedding, speakers[i]);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                bestSpeaker = i;
            }
        }

        if (maxSimilarity > threshold) {
            // Update speaker profile (running average)
            for (let j = 0; j < speakers[bestSpeaker].length; j++) {
                speakers[bestSpeaker][j] = (speakers[bestSpeaker][j] + segment.embedding[j]) / 2;
            }
        } else {
            // New speaker
            bestSpeaker = speakers.length;
            speakers.push([...segment.embedding]);
        }

        return {
            ...segment,
            speaker: `Speaker ${bestSpeaker + 1}`
        };
    });

    return results;
}
